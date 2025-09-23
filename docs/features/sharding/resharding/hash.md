---
icon: material/database-export-outline
---

# Move data

Moving data from the source to the destination database is done using logical replication. This is an online operation, and doesn't require a maintenance window or pausing query traffic.

The underlying mechanism is very similar to Postgres [subscriptions](https://www.postgresql.org/docs/current/sql-createsubscription.html), with some improvements, and happens in two steps:

1. Copy data in the [publication](schema.md#publication) to the destination database
2. Stream row changes in real-time

Once the replication stream synchronizes the two database clusters, the data on the destination cluster will be identical, within a few milliseconds, to the source cluster.

## CLI

PgDog has a command line interface you can call by running it directly:

```bash
pgdog data-sync \
    --from-database <name> \
    --from-user <name> \
    --to-database <name> \
    --to-user <name> \
    --publication <publication>
```

Required (*) and optional parameters for this command are as follows:

| Option | Description |
|-|-|
| `--from-database`* | Name of the source database cluster. |
| `--from-user`* | Name of the user configured in `users.toml` for the source database cluster. |
| `--to-database`* | Name of the destination database cluster. |
| `--to-user`* | Name of the user configured in `users.toml` for the destination database cluster. |
| `--publication`* | Name of the Postgres [publication](schema.md#publication) for tables to be copied and sharded. It should exist on the **source** database. |

## How it works

The first thing PgDog will do when data sync is started is create a replication slot on each primary database in the source cluster. This will prevent Postgres from removing the WAL, while we copy data for each table to the destination.

Next, each table will be copied, in parallel, to the destination database, using [sharded COPY](../copy.md). Once that's done, table changes are synchronized, in real-time, with logical replication from the replication slot created earlier.

The whole process happens entirely online, and doesn't require database reboots or pausing writes to the source database.

### Replication slot

PostgreSQL replication works on the basis of slots. They are virtual annotations in the Write-Ahead Log which prevent Postgres from recycling WAL segments and deleting the history of changes made to the database.

<center>
    <img src="/images/resharding-slot-2.png" width="75%" alt="Cross-shard queries" />
</center>

With logical replication, any client that speaks the protocol (like PgDog) can connect to the server and stream changes made to the database, starting at the position marked by the slot.

Before copying table data, we create a slot to mark a consistent starting point for our replication process. The slot is **permanent**, so even if resharding is interrupted, Postgres won't lose any of the WAL segments we need to resume it.

!!! note "Unused replication slots"
    Since permanent replication slots are not automatically removed by Postgres, if you choose to abort the resharding process, make sure to manually drop the replication slot to prevent excessive WAL accumulation on the source database.

Once the slot is created, PgDog starts copying data from all tables in the [publication](schema.md#publication), and resharding it in-flight.

### Copying data

Tables are copied from source to destination database using standard PostgreSQL `COPY` commands, with a few improvements.

#### Parallelization

If you are running PostgreSQL 16 or later and have configured replicas on the source database, PgDog can copy multiple tables in parallel, dramatically accelerating this process.

<center>
    <img src="/images/resharding-16x.png" width="75%" alt="Cross-shard queries" />
</center>

To set this up, make sure to add your read replicas to [`pgdog.toml`](../../../configuration/pgdog.toml/databases.md), for example:

```toml
[[databases]]
name = "source"
host = "10.0.0.1"
role = "replica"

[[databases]]
name = "source"
host = "10.0.0.2"
role = "replica"
```

PgDog will distribute the table copy load evenly between all replicas in the configuration. The more replicas are available for resharding, the faster it will complete.

!!! note "Dedicated replicas"
    To prevent the resharding process from impacting production queries, you can create a separate set of replicas just for resharding.

    Managed clouds (e.g., AWS RDS) make this especially easy, but require a warm-up period to fetch all the data from the backup snapshot, before they can read data at full speed of their storage volumes.

#### Binary `COPY`

PgDog uses the binary `COPY` format to send and receive data, which has been shown to be consistently faster than text, because it avoids the (de)serialization overhead of sending tuples in text form. PgDog decodes tuples in-flight and splits them evenly between destination shards, using the [sharded COPY](../copy.md) implementation.

!!! note "Binary compatibility"
    While the data format used by PostgreSQL databases hasn't changed in decades, binary `COPY` sends rows exactly as they are stored on disk.

    Therefore, sending binary data between two PostgreSQL databases running different
    versions of Postgres, however unlikely, could result in incompatibilities. We recommend to _not_ change major versions of the server while resharding.

Once all tables are copied and resharded on the destination database cluster, PgDog will begin streaming real-time row updates from the [replication slot](#replication-slot).

### Streaming updates

Once tables are copied over to the destination database, PgDog will stream any changes made to those tables from the [replication slot](#replication-slot) created previously. If it took a while to copy tables and the source database received a large volume of writes, this process could take some time.

You can check on the streaming process and estimate its ETA by querying the `pg_replication_slots` view on the __source__ database:

=== "Source database"
    ```postgresql
    SELECT confirmed_flush_lsn, pg_current_wal_lsn() FROM pg_replication_slots;
    ```

| Column | Description |
|-|-|
| `confirmed_flush_lsn` | The transaction identifier that has been written to the destination database cluster. |
| `pg_current_wal_lsn()` | Current position in the Write-Ahead Log for this database. |

The replication delay between the two database clusters is measured in bytes. When that number reaches zero, the two databases are byte-for-byte identical, and traffic can be [cut over](cutover.md) to the destination database.

## Next steps

- [Traffic cutover](cutover.md)
