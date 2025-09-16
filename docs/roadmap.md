---
icon: material/chart-gantt
---
# Roadmap

PgDog is being actively developed. Along with performance improvements and bug fixes, new features are constantly being added. The goal for PgDog is to manage most aspects of at-scale Postgres production operations, and we're just getting started.

### Chart

:material-check-circle-outline:  Stable and in production.

:material-wrench:  Partially built, but what's already there is working.

:material-calendar-check: On the roadmap, but not started yet.

:material-close: Not currently planned.

〃 Shorthand for "ditto" or "same as above".


## Foundational features

These features are required for PgDog to act as a replacement for PgBouncer and/or PgCat.

| Feature | Status | Notes |
|---------|--------|-------|
| [Transactional pooler](features/transaction-mode.md) | :material-check-circle-outline: | |
| [Session mode](features/session-mode.md) | :material-check-circle-outline: | No sharding or load balancing. |
| [Load balancer](features/load-balancer/index.md) | :material-check-circle-outline:  | |
| [Health checks & failover](features/load-balancer/healthchecks.md) | :material-check-circle-outline:  | |
| [Prepared statements](features/prepared-statements.md) | :material-check-circle-outline:  | |
| [Metrics](features/metrics.md) | :material-check-circle-outline: | Admin database views contain more columns than PgBouncer. |
| [Encryption](features/tls.md) | :material-check-circle-outline: | |
| [Authentication](features/authentication.md) | :material-wrench: | Password authentication only. `scram-sha-256`, `md5` are supported. |

## Sharding

These features are required for PgDog to shard Postgres databases without application changes.

### Query engine

Query engine provides a uniform view over multiple shards. Clients can use regular SQL statements to read and write data, as if they were using a normal (unsharded) database.

| Feature  | Status | Notes |
|----------|--------|-------|
| [Direct-to-shard reads](features/sharding/query-routing.md#select) | :material-check-circle-outline: | Sharding key must be specified in the query. |
| [Direct-to-shard writes](features/sharding/query-routing.md#insert) | :material-wrench: | Sharding key must be specified in the query. Multi-tuple `INSERT`s not supported yet. |
| [Cross-shard queries](features/sharding/cross-shard.md) | :material-wrench: | Partial [aggregates](#aggregates) and [sorting](#sorting) support. CTEs & subqueries not supported yet. |
| Cross-shard CTEs | :material-calendar-check: | [#380](https://github.com/pgdogdev/pgdog/issues/380) |
| Cross-shard subqueries | :material-calendar-check: | [#381](https://github.com/pgdogdev/pgdog/issues/381) |
| Cross-shard joins | :material-calendar-check: | [#94](https://github.com/pgdogdev/pgdog/issues/94) |
| [Cross-shard transactions](features/sharding/2pc.md) | :material-wrench: | Supports [two-phase commit](features/sharding/2pc.md). Not benchmarked yet. |
| [Omnisharded tables](features/sharding/omnishards.md) | :material-wrench: | Unsharded tables with identical data on all shards. |
| Rewrite queries | :material-calendar-check: | Alter queries to support aggregate/sorting by rows not returned in result set. |
| [`COPY`](features/sharding/copy.md) | :material-check-circle-outline: | Sharding key must be specified in the statement and the data. Supports text, CSV, and binary formats only. |
| Multi-statement queries | :material-calendar-check: | e.g.: `SELECT 1; SELECT 2;`. First query is used for routing only, entire request sent to the same shard(s). [#395](https://github.com/pgdogdev/pgdog/issues/395). |


#### Aggregates

Support for aggregate functions in [cross-shard](features/sharding/cross-shard.md) queries.

| Aggregate function | Status | Notes |
|-----------|--------|-------|
| `SUM` | :material-check-circle-outline: | Target column(s) must be present in returned rows. |
| `COUNT` | :material-check-circle-outline: | 〃 |
| `MIN` | :material-check-circle-outline: | 〃 |
| `MAX` | :material-check-circle-outline: | 〃 |
| `AVG` | :material-calendar-check: | [#434](https://github.com/pgdogdev/pgdog/issues/434) |
| Percentile distributions | :material-close: | Could be expensive to calculate, need spill to disk. |

#### Sorting

Support for sorting rows in [cross-shard](features/sharding/cross-shard.md) queries.

| Sorting function | Status | Notes |
|-|-|-|
| `ASC column` | :material-check-circle-outline: | Target column(s) must be present in returned rows. |
| `DESC column` | :material-check-circle-outline: | 〃 |
| `ASC a, b, c` | :material-check-circle-outline: | Sorting by multiple columns works. Columns must be present in returned rows. |
| `DESC a, b, c` | :material-check-circle-outline: | 〃 |
| `<->` | :material-check-circle-outline: | `pgvector` sort by L2. Both columns must be in result set. |

### Resharding

[Resharding](features/sharding/resharding/index.md) splits existing database(s) into more shards, without requiring downtime.

| Feature | Status | Notes |
|-|-|-|
| [Data sync](features/sharding/resharding/hash.md#data-sync) | :material-wrench: | Sync table data with logical replication. Not benchmarked yet. |
| [Schema sync](features/sharding/resharding/schema.md) | :material-wrench: | Sync table, index and constraint definitions. Not benchmarked yet. |
| Online rebalancing | :material-calendar-check: | Not automated yet, requires manual orchestration. |

### Schema & data integrity

Manage [table schema(s)](features/sharding/schema_management/index.md) and ensure data constraints are enforced across multiple shards.

| Feature | Status | Notes |
|-|-|-|
| [Primary keys](features/sharding/schema_management/primary_keys.md) | :material-calendar-check: | `BIGINT` and `UUID` partially supported for hash-based sharding only. [#386](https://github.com/pgdogdev/pgdog/issues/386). Other data types require cross-shard unique index support. |
| Unique indexes | :material-calendar-check: | Enforce uniqueness constraints across an unsharded column(s). [#439](https://github.com/pgdogdev/pgdog/issues/439). |
| `CHECK` constraints | :material-close: | They are generally arbitrary SQL checks and need to be executed prior to row updates. |
| Schema validator | :material-calendar-check: | Check that all shards have identical tables, indexes, etc. |


## Orchestration

Features around production deployments.

| Feature | Status | Notes |
|-|-|-|
| DNS cache | :material-wrench: | Override DNS TTL to accelerate failover. Built but not documented. |
| Primary failover to standby | :material-close: | Move writes from a failed primary database to a standby replica, promoting it. Not currently planned. |
| Configuration sync | :material-wrench: | Synchronize config changes between instances of PgDog. [Admin command](administration/maintenance_mode.md) to pause traffic exists, but no automation. |
