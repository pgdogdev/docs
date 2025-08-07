# Mirroring


!!! note
    This feature is still experimental. Please [report](https://github.com/pgdogdev/pgdog/issues) any issues you encounter.

Database mirroring replicates traffic, byte for byte, from one database to another. This allows to test how databases respond to production traffic, without affecting production databases.

## How it works


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
    You can have as many mirrors as you like. Queries will be sent asynchronously to each one of them, in parallel. More mirrors will require more CPU and network resources, so make sure to allocate enough compute to PgDog in production.

You can connect to the mirror database like any other. The same connection pool will be used for mirrored queries. Production database connection pool will not be affected, since all replication happens in a background.

Each client connected to the main database has its own queue, so concurrency scales linearly with the number of clients.

#### Mirror queue

If the mirror database(s) can't keep up with production traffic, queries will back up in the queue. To make sure it doesn't overflow and cause out-of-memory errors, the size of the queue is configurable:

```toml
[general]
mirror_queue = 500
```

If the queue is full, all subsequent queries will be dropped until there is space in the queue again.

!!! warning
    Since mirror queues can drop queries, it is not a replacement for Postgres replication and should be used for testing & benchmarking purposes only.

#### Exposure

It's possible to send only a percentage of production traffic to the mirrors. This is useful when warming up databases from a snapshot or if the mirror databases are smaller than production and can't handle all of its traffic.

The percentage of traffic is configurable:

```toml
[general]
mirror_exposure = 0.5 # 50%
```

Acceptable values are between **0.0** (0%) and **1.0** (100%). This setting is changeable at runtime, without restarting PgDog. When adding a mirror, it's always a good idea to start slow, e.g., 0.1% (`mirror_exposure = 0.01`) of transactions, and gradually increase exposure over time.
