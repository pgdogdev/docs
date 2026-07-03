---
icon: material/database-export-outline
---

# Move data

Moving data from the source to the destination database is done using logical replication. This is an online operation, and doesn't require a maintenance window or pausing query traffic.

The underlying mechanism is very similar to Postgres [subscriptions](https://www.postgresql.org/docs/current/sql-createsubscription.html), with some improvements, and happens in two steps:

| Step | Description |
|-|-|
| [Copy data](#how-it-works) | Copy data from all tables in the [publication](schema.md#publication) to the destination database. |
| [Stream row changes](#streaming-updates) | Stream row changes in real-time, keeping both source and destination databases in-sync. |

Once the replication stream synchronizes the two database clusters, the data on the destination cluster will be identical to the source cluster with a few milliseconds of delay.

## Performing the move

Moving data can be done in one of two ways:

1. Using an [admin database](../../../administration/index.md) command
2. Using a CLI command

### Admin database command

The admin database provides a way to execute commands, without having to spawn an independent PgDog process. To move data and replicate rows from the source database to the destination, you can run the following command:

```
COPY_DATA <source> <destination> <publication> [<replication slot>];
```

This will spawn a background task that will copy all tables in the [publication](schema.md#publication) to the destination database, while redistributing rows between shards. Once the copy is complete, PgDog will proceed to stream row changes, keeping the two databases in close synchronization.

#### Example

To copy data from database `"prod"` to database `"prod_sharded"` and the `"all_tables"` publication, execute the following command:

=== "Admin command"
    ```
    COPY_DATA prod prod_sharded all_tables;
    ```
=== "Output"
    ```
     task_id | replication_slot
    ---------+-----------------------------
     12      | __pgdog_repl_a1b2c3d4e5f6...
    ```

`COPY_DATA` returns immediately with the background `task_id` and the auto-generated replication slot name. Track the task with [`SHOW TASKS`](../../../administration/tasks.md) and stop it with `STOP_TASK <task_id>`.

### CLI

PgDog has a command line interface you can call by running it directly:

```bash
pgdog data-sync \
    --from-database <name> \
    --to-database <name> \
    --publication <publication> \
```

Required (*) and optional parameters for this command are as follows:

| Option | Description |
|-|-|
| `--from-database`* | Name of the source database cluster. |
| `--to-database`* | Name of the destination database cluster. |
| `--publication`* | Name of the Postgres [publication](schema.md#publication) for tables to be copied and sharded. It should exist on the **source** database. |
| `--replication-slot` | Name of the replication slot to use (and create if it doesn't exist) for syncing real-time changes. |
| `--replicate-only` | Don't copy data, just stream changes from the replication slot. |
| `--sync-only` | Perform the initial data sync only and exit. |
| `--skip-schema-sync` | Don't run the pre-data schema sync first (assume the destination schema already exists). |

Unlike the `COPY_DATA` admin command, the CLI runs in the foreground as a separate `pgdog` process: it blocks while it copies the data and then keeps streaming changes until you stop it with `SIGINT` (or `SIGTERM`, which winds the task down gracefully), or until you pass `--sync-only` to copy and exit. It does not return a `task_id` and is not visible in [`SHOW TASKS`](../../../administration/tasks.md).

## How it works

The first thing PgDog will do when data sync is started is create a replication slot on each primary database in the source cluster. This will prevent Postgres from removing the WAL, while PgDog copies data for each table to the destination.

Next, each table will be copied, in parallel, to the destination database, using [sharded COPY](../cross-shard-queries/copy.md). Once that's done, table changes are synchronized, in real-time, with logical replication from the replication slot created earlier.

The whole process happens entirely online, and doesn't require database reboots or pausing writes to the source database.

### Replication slot

PostgreSQL replication works on the basis of slots. They are virtual annotations in the Write-Ahead Log which prevent Postgres from recycling WAL segments and deleting the history of changes made to the database.

<center>
    <img src="/images/resharding-slot-2.png" width="75%" alt="Replication slot" />
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
    <img src="/images/resharding-16x.png" width="75%" alt="Parallel table copy" />
</center>

To set this up, make sure to add your read replicas to [`pgdog.toml`](../../../configuration/pgdog.toml/databases.md), for example:

=== "pgdog.toml"
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
=== "Helm chart"
    ```yaml
    databases:
      - name: source
        host: 10.0.0.1
        role: replica
      - name: source
        host: 10.0.0.2
        role: replica
    ```

PgDog will distribute the table copy load evenly between all replicas in the configuration. The more replicas are available for resharding, the faster it will complete.

!!! note "Dedicated replicas"
    To prevent the resharding process from impacting production queries, you can create a separate set of replicas just for resharding.

    Managed clouds (e.g., AWS RDS) make this especially easy, but require a warm-up period to fetch all the data from the backup snapshot, before they can read data at full speed of their storage volumes.

    To make sure dedicated replicas are not used for read queries in production, you can configure PgDog to use them for resharding only:

    === "pgdog.toml"
        ```toml
        [[databases]]
        name = "prod"
        host = "10.0.0.1"
        role = "replica"
        resharding_only = true
        ```
    === "Helm chart"
        ```yaml
        databases:
          - name: prod
            host: 10.0.0.1
            role: replica
            reshardingOnly: true
        ```

#### Binary `COPY`

PgDog uses the binary `COPY` format to send and receive data, which has been shown to be consistently faster than text, because it avoids the (de)serialization overhead of sending tuples in text form. PgDog decodes tuples in-flight and splits them evenly between destination shards, using the [sharded COPY](../cross-shard-queries/copy.md) implementation.

!!! note "Binary compatibility"
    While the data format used by PostgreSQL databases hasn't changed in decades, binary `COPY` sends rows exactly as they are stored on disk.

    Therefore, sending binary data between two PostgreSQL databases running different
    versions of Postgres, however unlikely, could result in incompatibilities. We recommend to _not_ change major versions of the server while resharding.

Once all tables are copied and resharded on the destination database cluster, PgDog will begin streaming real-time row updates from the [replication slot](#replication-slot).

#### Integer primary keys

If your primary keys are using the `INTEGER` data type (like in older Rails versions, for example), PgDog will automatically migrate them to use `BIGINT` during the resharding process. This is required because PgDog's [unique ID](../unique-ids.md) generation function, which replaces sequences in sharded databases, produces 64-bit integers.

If this is the case, the binary `COPY` will not work, and you need to use text copy protocol instead. This can be configured in [`pgdog.toml`](../../../configuration/pgdog.toml/general.md#resharding_copy_format):

=== "pgdog.toml"
    ```toml
    [general]
    resharding_copy_format = "text"
    ```
=== "Helm chart"
    ```yaml
    reshardingCopyFormat: text
    ```

#### Monitoring progress

The table copies can take some time and PgDog provides a real-time view to monitor the progress in the admin database:

=== "Admin command"
    ```
    SHOW TABLE_COPIES;
    ```
=== "Output"
    ```
    -[ RECORD 1 ]-------+--------------------------------------------------
     schema              | public
     table               | orders
     status              | running
     rows                | 845000
     rows_human          | 845,000
     bytes               | 124500000
     bytes_human         | 118.73 MB
     bytes_per_sec       | 4150000
     bytes_per_sec_human | 3.96 MB
     elapsed             | 00:00:30:000
     elapsed_ms          | 30000
     sql                 | COPY public.orders (id, user_id, total, created_at)
    ```

### Streaming updates

Once tables are copied over to the destination database, PgDog will stream any changes made to those tables from the [replication slot](#replication-slot) created in the previous step. If it took a while to copy tables and the source database received a large volume of writes, this process could take some time.

You can check on the streaming process and estimate its ETA by querying admin database:

=== "Admin command"
    ```
    SHOW REPLICATION_SLOTS;
    ```
=== "Output"
    ```
    -[ RECORD 1 ]-------+-------------------------------
      host                | 10.0.1.5
      port                | 5432
      database_name       | prod
      name                | pgdog_slot_0
      lsn                 | 0/1A3B4C80
      lag                 | 2.35 MB
      lag_bytes           | 2465792
      copy_data           | t
      last_transaction    | 2026-03-03 22:22:08.341 UTC
      last_transaction_ms | 1250
    ```

Some of this information can be obtained by querying the source database as well, for example:

```postgresql
SELECT
  pg_replication_slots.*,
  pg_current_wal_lsn()
FROM pg_replication_slots;
```
The replication delay between the two database clusters is measured in bytes. When that number reaches zero, the two databases are byte-for-byte identical.

`COPY_DATA` keeps streaming changes indefinitely, keeping the destination in sync with the source. To monitor or stop the background task, see the task-level view below.

### Monitoring the task

When started from the admin database, `COPY_DATA` runs as a background task. List all tasks, their current status, and elapsed time with:

=== "Admin command"
    ```
    SHOW TASKS;
    ```
=== "Output"
    ```
     id | scope | type                         | status  | inner_status | elapsed
    ----+-------+------------------------------+---------+--------------+----------
     12 | root  | reshard prod -> prod_sharded | running | replicating  | 00:02:14
    ```

`COPY_DATA` runs the same pipeline as `RESHARD` but leaves the traffic in place, so it appears with a `reshard` type and progresses through `syncing data` to `replicating`. Stop it with `STOP_TASK <task_id>`. See [Background tasks](../../../administration/tasks.md) for the full column and status reference.

## Troubleshooting

### Shard failure during copy

If a shard goes down mid-copy, PgDog retries that table with exponential backoff. By default: up to **5 attempts**, starting at **1 second** and doubling each time.

| Situation | Behavior |
|-|-|
| Destination shard down | New connection opened on the next attempt. |
| Source shard down | `TEMPORARY` replication slot re-created from scratch. It's cleaned up automatically when the connection closes before starting new attempt. |

To change the defaults, configure [`resharding_copy_retry_max_attempts`](../../../configuration/pgdog.toml/general.md#resharding_copy_retry_max_attempts) and [`resharding_copy_retry_min_delay`](../../../configuration/pgdog.toml/general.md#resharding_copy_retry_min_delay) in `pgdog.toml`:

=== "pgdog.toml"
    ```toml
    [general]
    resharding_copy_retry_max_attempts = 5    # per-table retry attempts
    resharding_copy_retry_min_delay = 1000   # base backoff in ms; doubles each attempt, max 32×
    ```
=== "Helm chart"
    ```yaml
    reshardingCopyRetryMaxAttempts: 5    # per-table retry attempts
    reshardingCopyRetryMinDelay: 1000   # base backoff in ms; doubles each attempt, max 32×
    ```

### Transient errors during replication streaming

After the initial copy completes, PgDog streams WAL changes from the source. If a transient error occurs (e.g., a dropped connection or a momentary network interruption) during streaming, PgDog retries automatically: it sleeps for the configured delay, then reconnects using the source replication slot and all destination shard connections in parallel before resuming.

By default: up to **5 attempts**, with a fixed **1 second** delay between each.

To change the defaults, configure [`resharding_replication_retry_max_attempts`](../../../configuration/pgdog.toml/general.md#resharding_replication_retry_max_attempts) and [`resharding_replication_retry_min_delay`](../../../configuration/pgdog.toml/general.md#resharding_replication_retry_min_delay) in `pgdog.toml`:

```toml
[general]
resharding_replication_retry_max_attempts = 5    # 0 = retry indefinitely
resharding_replication_retry_min_delay = 1000   # fixed delay in ms
```

### Primary key violations when retrying after copy failure

In rare cases, if the connection drops after `COPY` commits but before PgDog records the table as done, some rows may remain in the destination. The next retry will hit primary key violations.


PgDog catches this and tells you exactly what to run:

```
data sync for "public"."orders" failed with rows remaining in destination;
truncate manually before retrying: TRUNCATE "public"."orders_new";
```

Run the `TRUNCATE` on the destination (you can copy the command above, but make sure to run it strictly on the destination), then re-run `COPY_DATA`.

### Binary format mismatch

Different major Postgres versions can produce incompatible binary `COPY` data. PgDog surfaces this as a `BinaryFormatMismatch` error. Switch to text:

=== "pgdog.toml"
    ```toml
    [general]
    resharding_copy_format = "text"
    ```
=== "Helm chart"
    ```yaml
    reshardingCopyFormat: text
    ```

See [Integer primary keys](#integer-primary-keys) for the other common reason to use text format.

### Replication slot not cleaned up after stop or crash

Stopping a task gracefully with `STOP_TASK` winds the replication stream down and drops its **permanent** replication slot for you. However, if PgDog exits unexpectedly (crash, `SIGKILL`, lost connection) the slot can remain on the source. Postgres will not recycle WAL until it is dropped, so clean it up manually:

```postgresql
SELECT pg_drop_replication_slot('slot_name');
```

The slot name appears in the `COPY_DATA` startup log and in `SHOW REPLICATION_SLOTS`.
## Next steps

{{ next_steps_links([
    ("Traffic cutover", "cutover.md", "Switch live traffic to the destination database."),
]) }}
