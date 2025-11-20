---
icon: material/chart-timeline-variant
---

# Replication and failover

!!! note "Experimental feature"
    This feature is new and experimental. Make sure to test it before deploying
    to production.

PgDog has built-in functionality for monitoring the state of Postgres replica databases. If configured, it can also automatically detect when a replica is promoted, and redirecting write queries to the new primary.

## Replication

When enabled, PgDog will periodically query all databases configured in [`pgdog.toml`](../../configuration/pgdog.toml/databases.md) to fetch the following information:

1. Logical sequence number (LSN)
2. Value returned by [`pg_is_in_recovery()`](#pg_is_in_recovery)
3. Timestamp of the last transaction

This information can be viewed in real-time by querying the [admin](../../administration/index.md) database with the `SHOW REPLICATION` command.

### Replication lag

In addition to fetching raw metrics, PgDog can calculate the replication lag (also known as "replication delay") between the primary and each replica. The lag is calculated in milliseconds and uses the following formula:

| Step | Description |
|-|-|
| Primary LSN | Get the LSN from the primary using `pg_current_wal_lsn()`. |
| Replica LSN | Get the LSN from each replica using `pg_last_wal_replay_lsn()` or `pg_last_wal_receive_lsn()`. |
| LSN check | If the two LSNs are identical, replication lag is 0. |
| Calculate lag | If the two LSNs are different, replication lag is `now() - pg_last_xact_replay_timestamp()`. |

This formula assumes that when the replica's LSN is behind the primary, the primary is still receiving write requests. While this is not always the case, it will show replication lag growing over time if the replication stream is falling behind or is broken.

### Configuration

By default, PgDog will not query databases for its replication status. To enable this feature, configure it in [`pgdog.toml`](../../configuration/pgdog.toml/general.md#replication):

```toml
[general]
# Start running the LSN check immediately.
lsn_check_delay = 0

# Run LSN check every second.
lsn_check_interval = 1_000 
```

| Setting | Description |
|-|-|
| `lsn_check_delay` | For how long to delay fetching replication status on PgDog launch. By default, this is set to infinity, so the feature is disabled. |
| `lsn_check_interval` | How frequently to re-fetch the replication status. The query is cheap to run, so you can set it to run frequently. |

## Failover

<center>
  <img src="/images/failover.png" width="95%" alt="Failover" />
</center>

If `pg_is_in_recovery()` returns `true`, PgDog will assume that the database is the primary and will start sending it write query traffic. The old primary is demoted to the replica role.

!!! warning "Failover trigger"
    PgDog does not detect primary failure and **will not** call `pg_promote()`. It is expected that the databases are managed externally by another tool, like Patroni or AWS RDS, which handle replica promotion.

### `pg_is_in_recovery()`

The `pg_is_in_recovery()` function returns `true` if the database is configured as a standby. It can only serve read queries (e.g. `SELECT`) and is expected to be reasonably up-to-date with the primary database.

Replica databases can be _promoted_ to serve write queries. If that happens, `pg_is_in_recovery()` will return `false`. You can read more about this in the [PostgreSQL documentation](https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-RECOVERY-CONTROL).
