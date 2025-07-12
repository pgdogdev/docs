# Mirroring

Database mirroring replicates traffic, byte for byte, from one database to another. This allows to test how databases respond to production traffic, without breaking production databases.

## How it works

!!! note
    This feature is still experimental. Please [report](https://github.com/pgdogdev/pgdog/issues) any issues you may run into.

Mirroring in PgDog is asynchronous and shouldn't impact production traffic: transactions are sent to a background task, which in turn forwards them to one or more mirror databases. If any statement fails, the error is ignored and the next one is executed.

<center>
  <img src="/images/mirroring.png" width="80%" height="auto" alt="Mirroring" style="width: 80%;">
</center>

### Configuring mirroring

To use mirroring, first configure both the mirror and the production database in `pgdog.toml`. Once you have it running, add `mirror_of` to all instances of the mirror database:

```toml
[[databases]]
name = "prod"
host = "10.0.0.1"

[[databases]]
name = "staging_db"
host = "10.0.2.25"
mirror_of = "prod"
```

!!! note
    You can have as many mirrors as you like. Queries will be sent asynchronously to each one of them at runtime. More mirrors will require more CPU and network resources to service, so make sure to allocate enough compute to PgDog in production.

You can connect to the mirror database like any other. The same connection pool will be used for mirrored queries. Production database connection pool will not be affected, since all replication happens in a background.

Each client connected to the main database has its own queue, so concurrency scales linearly with the number of clients and executed queries.

#### Mirror queue

If the mirror database(s) can't keep up with production traffic, queries will back up in the queue. To make sure it doesn't overflow and cause out-of-memory errors, the size of the queue is configurable:

```toml
[general]
mirror_queue = 500
```

If the queue is full, all subsequent queries will be dropped until there is space in the queue again.

!!! warning
    Since mirror queues can drop queries, it is not a replacement for Postgres replication and should be used for testing & benchmarking purposes only.

### Comparison to Postgres replication

Mirroring is a best effort strategy for replaying queries. There are no retries or guarantees that the statements are executed in the same order on the mirror. It should be used strictly for benchmarking or testing mirror databases, not for reliably replicating data.
