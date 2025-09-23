---
icon: material/database-edit-outline
---
# Schema sync

PgDog can copy tables, indexes and other entities from your production database to the new, sharded database automatically. This is faster than using `pg_dump`, because we separate this process into two parts:

1. [Create tables](#tables-and-primary-keys), primary key indexes, and sequences
2. Create [secondary indexes](#secondary-indexes)

The create tables step needs to be performed first, before [copying data](hash.md). The second step is performed once the data sync is almost complete.

## CLI

PgDog has a command line interface you can call by running it directly. Schema sync is controlled by a CLI command:

```
pgdog schema-sync \
  --from-database <name> \
  --to-database <name> \
  --publication <publication>
```

Required (*) and optional parameters for this command are as follows:

| Parameter | Description |
|-|-|
| `--from-database`* | The name of the source database in `pgdog.toml`. |
| `--to-database`* | The name of the destination database in `pgdog.toml`. |
| `--publication`* | The name of the Postgres table [publication](#publication) with the tables you want to sync. |
| `--dry-run` | Print the SQL statements that will be executed on the destination database and exit. |
| `--ignore-errors` | Execute SQL statements and ignore any errors. |
| `--data-sync-complete` | Run the second step to create secondary indexes and sequences. |

## Tables and primary keys

The first step in the schema sync copies over tables and their primary key indexes from the source database to the new, resharded cluster. This has to be done separately, because Postgres's logical replication only copies data and doesn't manage table schemas.

### Primary keys

A primary key constraint is **required** on all tables for logical replication to work correctly. Without a unique index identifying each row in a table, logical replication is not able to perform `UPDATE` and `DELETE` commands.

Before starting the resharding process for your database, double-check that you have primary keys on all your tables.

## Publication

Since PgDog is using logical replication to move and reshard data, a [publication](https://www.postgresql.org/docs/current/sql-createpublication.html) for the relevant tables needs to be created on the source database.

The simplest way to do this is to run the following command:

=== "Source database"
    ```postgresql
    CREATE PUBLICATION pgdog FOR ALL TABLES;
    ```

This will make sure _all_ tables in your database will be copied and resharded into the destination database cluster.

!!! note "Multiple schemas"
    If you're using schemas other than `public`, create them on the destination database before running the schema sync.

## Schema admin

Schema sync creates tables, indexes, and other entities on the destination database. To make sure that's done with a user with sufficient privileges (e.g., `CREATE` permission on the database), you need to add it to [`users.toml`](../../../configuration/users.toml/users.md) and mark it as the schema administrator:

```toml
[[users]]
name = "migrator"
database = "prod"
password = "hunter2"
schema_admin = true
```

PgDog will use that user to connect to the source and destination databases, so make sure to specify one for both of them.

### `pg_dump` version

PgDog is using `pg_dump` under the hood to export schema definitions. Postgres requires the version of `pg_dump` and the Postgres server to be identical. Our [Docker image](../../../installation.md) comes with `pg_dump` for PostgreSQL 16, but your database server may run a different version.

Before proceeding, make sure to install the correct version of `pg_dump` for your source database. If you have multiple versions of `pg_dump` installed on the same host, you can specify the path to the right one in `pgdog.toml`:

```toml
[replication]
pg_dump_path = "/path/to/pg_dump"
```

## Secondary indexes

This step is performed after [data sync](hash.md) is complete. Running this step will create secondary indexes on all your tables, which will take some time, depending on the number of indexes in your schema.

## Next steps

- [Move data](hash.md)
