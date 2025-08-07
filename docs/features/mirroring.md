# Mirroring


!!! note
    This feature is still experimental. Please [report](https://github.com/pgdogdev/pgdog/issues) any issues you encounter.

Database mirroring replicates traffic, byte for byte, from one database to another. This allows to test how databases respond to real, production traffic.

## How it works


Mirroring in PgDog is asynchronous and should have minimal impact production databases: transactions are sent to a background task, which in turn forwards them to one or more mirror databases. If any statement fails, the error is ignored and the next one is executed.

<center>
  <img src="/images/mirroring.png" width="80%" height="auto" alt="Mirroring" style="width: 80%;">
</center>

### Configure mirroring

To use mirroring, first configure both the mirror and the production database in [`pgdog.toml`](../configuration/pgdog.toml/general.md). Once both databases are running, add `mirror_of` to all instances of the mirror database:

```toml
[[databases]]
name = "prod"
host = "10.0.0.1"

[[databases]]
name = "staging_db"
host = "10.0.2.25"
mirror_of = "prod"
```

You can connect to the mirror database like any other. The same connection pool will be used for mirrored queries. Production database connection pool will not be affected, since all replication happens in a background.

Each client connected to the main database has its own queue, so concurrency scales linearly with the number of clients.

You can have as many mirror databases as you like. Queries will be sent to each one of them, in parallel. More mirrors will require more CPU and network resources, so make sure to allocate enough compute to PgDog in production.

#### Mirror queue

If the mirror database(s) can't keep up with production traffic, queries will back up in the queue. To make sure it doesn't overflow and cause out-of-memory errors, the size of the queue is limited:

```toml
[general]
mirror_queue = 500
```

If the queue gets full, all subsequent mirrored transactions will be dropped until there is space in the queue again.

!!! note
    Since mirror queues can drop queries, it is not a replacement for Postgres replication and should be used for testing & benchmarking purposes only.

#### Exposure

It's possible to limit how much traffic mirror databases receive. This is useful when warming up databases from a snapshot or if the mirror databases are smaller than production and can't handle as many transactions.

This is configurable using a percentage, relative to the amount of transactions sent to the source database:

```toml
[general]
mirror_exposure = 0.5 # 50%
```

Acceptable values are between **0.0** (0%) and **1.0** (100%).

This is changeable at runtime, without restarting PgDog. When adding a mirror, it's a good idea to start slow, e.g., with only 0.1% exposure (`mirror_exposure = 0.01`), and gradually increase it over time.

#### Realism

We try to make mirrored traffic as realistic as possible. For each statement inside a transaction, we record the timing between that statement and the next one.

When replaying traffic against a mirror, we pause between statements for the same amount of time. This helps reproduce lock contention experienced by production databases, on the mirrors.
