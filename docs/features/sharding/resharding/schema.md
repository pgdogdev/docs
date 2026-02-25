---
icon: material/database-edit-outline
---
# Schema sync

PostgreSQL logical replication requires that tables on both the source and destination databases contain the same columns, with compatible data types. PgDog takes care of this, by using `pg_dump` under the hood, and re-creating table and index definitions, in an optimal order, on the new shards.

### Synchronization phases

The schema synchronization process is composed of 4 distinct steps, all of which are executed automatically by PgDog during resharding:

| Phase | Description |
|-|-|
| [Pre-data](#pre-data-phase) | Create identical tables on all shards along with the primary key constraint (and index). Secondary indexes are _not_ created yet. |
| [Post-data](#post-data-phase) | Create secondary indexes on all tables and shards. This is done after [moving data](hash.md), as a separate step, because it's considerably faster to create indexes on whole tables than while inserting individual rows. |
| [Cutover](#cutover) | This step is executed during traffic cutover, while application queries are blocked from executing on the database. |
| Post-cutover | This step makes sure the rollback database cluster can handle reverse logical replication. |

## Performing the sync

Schema synchronization can be performed using one of two methods:

1. Using an [admin database](../../../administration/index.md) command
2. Using a CLI command

### Admin database command

The admin database provides an easy way to execute commands, without having to spawn a new PgDog process. The schema synchronization command has the following syntax:

```
SCHEMA_SYNC <phase> <source database> <destination database> <publication>;
```

The `<phase>` argument accepts the following values:

| Phase | Description |
|-|-|
| `PRE` | Perform the pre-data schema synchronization phase. |
| `POST` | Perform the post-data schema synchronization phase. |

##### Example

To perform schema synchronization for the pre-data step from database `"prod"` to database `"prod_sharded"` and the `"all_tables"` publication, execute the following command:

```
SCHEMA_SYNC PRE prod prod_sharded all_tables;
```

### CLI

PgDog has a command line interface you can call by running the `pgdog` executable directly. Schema sync has its own CLI command with the following arguments:

```
pgdog schema-sync \
  --from-database <name> \
  --to-database <name> \
  --publication <publication>
```

| Parameter | Description |
|-|-|
| `--from-database` * | The name of the source database in [`pgdog.toml`](../../../configuration/pgdog.toml/databases.md). |
| `--to-database` * | The name of the destination database in [`pgdog.toml`](../../../configuration/pgdog.toml/databases.md). |
| `--publication` * | The name of the PostgreSQL [publication](#publication) with the tables you want to synchronize. |
| `--dry-run` | Only print the SQL statements that will be executed on the destination database and exit. |
| `--ignore-errors` | Ignore any errors caused by executing any of the schema synchronization SQL statements. |
| `--data-sync-complete` | Run the post-data step to create secondary indexes and sequences. |
| `--cutover` | Run the cutover step during traffic cutover. |

## Pre-data phase

The pre-data phase takes care of replicating the following Postgres schema entities:

1. Table schemas (e.g. `CREATE SCHEMA`)
2. Table definitions, with identical columns and data types (e.g., `CREATE TABLE`)
3. Custom types and domains (e.g., `CREATE TYPE`, `CREATE DOMAIN`)
4. Extensions (e.g., `CREATE EXTENSION pgvector`)
5. Primary key constraints and corresponding unique indexes (e.g., `PRIMARY KEY (id)`)
6. Table publications (e.g., `CREATE PUBLICATION`)

!!! note "Primary key requirement"
    PgDog requires that _all_ tables that are being resharded contain a **primary key** constraint. This is important for logical replication
    and guarantees that `UPDATE` and `DELETE` statements are replicated correctly between the source database and the new shards.

Since the pre-data phase creates only empty tables, it can be executed very quickly even for databases with a larger number of tables, extensions and custom data types.

### Publication

Since PgDog is using logical replication to move and reshard data, a [publication](https://www.postgresql.org/docs/current/sql-createpublication.html) for the relevant tables needs to be created on the source database beforehand. The simplest way to do this is to run the following command:

```postgresql
CREATE PUBLICATION pgdog FOR ALL TABLES;
```

This will make sure all tables and schemas in your database are copied and resharded into the destination database cluster.

##### Example

=== "Admin database"
    ```
    SCHEMA_SYNC PRE prod prod_sharded all_tables;
    ```
=== "CLI"
    ```
    pgdog schema-sync \
      --from-database prod \
      --to-database prod_sharded \
      --publication all_tables
    ```

## Post-data phase

The post-data phase is performed after the [data copy](hash.md) is complete and tables have been synchronized with logical replication. Its job is to create all secondary indexes (e.g., `CREATE INDEX`).

This step is performed after copying data because it makes the copy process considerably faster: Postgres doesn't need to update several indexes while writing rows into the tables.

##### Example

=== "Admin database"
    ```
    SCHEMA_SYNC POST prod prod_sharded all_tables;
    ```
=== "CLI"
    ```
    pgdog schema-sync \
      --from-database prod \
      --to-database prod_sharded \
      --publication all_tables
      --data-sync-complete
    ```

### Tracking progress

Since creating indexes on large tables can take some time, PgDog provides an admin database command to monitor the progress:

=== "Admin command"
    ```
    SHOW SCHEMA_SYNC;
    ```
=== "Output"
    ```
    -[ RECORD 1 ]+-----------------------------------------------------------------------------------------------
      database     | pgdog
      user         | pgdog
      shard        | 1
      kind         | index
      sync_state   | running
      started_at   | 2026-01-15 10:32:01.042 UTC
      elapsed      | 3s
      elapsed_ms   | 3012
      table_schema | public
      table_name   | users
      sql          | CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_email_idx" ON "public"."users" USING btree ("email")
    ```

### Schema admin

Schema sync creates tables, indexes, and other entities on the destination database. To make sure that this is done with a user with sufficient privileges (e.g., `CREATE` and `REPLICATION` permissions on the database), make sure to add such a user to [`users.toml`](../../../configuration/users.toml/users.md) and mark it as the schema administrator:

```toml
[[users]]
name = "migrator"
database = "prod"
password = "hunter2"
schema_admin = true
```

PgDog will use this user to connect to the source and destination databases, so make sure to specify one for both databases in the configuration.

## Cutover

During the cutover, PgDog will execute last minute schema synchronization commands to make sure the destination sharded cluster works as expected. This involves putting back constraints that were removed for logical replication to work and moving sequence values.

## Post-cutover

The post-cutover phase makes sure the source database can accept logical replication streams from the new shards. This maintains the old database in sync, in case the operator decides to roll back the resharding process.

## Dependencies

PgDog is using `pg_dump` under the hood to export table, schema and index definitions. PostgreSQL servers typically require that the version of `pg_dump` and the version of the server are identical. Our [Docker image](../../../installation.md) comes with `pg_dump` for PostgreSQL 16 by default, but your database server may run a different version.

Before proceeding, make sure to install the correct version of `pg_dump` for your source database. If you have multiple versions of `pg_dump` installed on the same host, you can specify the path to the right one in `pgdog.toml`:

```toml
[replication]
pg_dump_path = "/path/to/pg_dump"
```

## Next steps

{{ next_steps_links([
    ("Move data", "hash.md", "Redistribute data between shards using the configured sharding function. This happens without downtime and keeps the shards up-to-date with the source database until traffic cutover."),
]) }}
