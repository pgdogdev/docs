# Roadmap

PgDog is being actively developed. Along with performance improvements and bug fixes, new features are constantly being added. The goal for PgDog is to manage most aspects of Postgres horizontal scalability, and we're just getting started.

## Foundational features

These features are required for PgDog to act as a replacement for PgBouncer and/or PgCat.

| Feature | Status |
|---------|--------|
| Transactional pooler | Almost finished. Currently testing and benchmarking. |
| Session mode | Works pretty well. Needs more tests and benchmarks. |
| Load balancing | Tested and works well. Adding more tests and benchmarks. |
| Failover | Tested and works well. Adding more tests and benchmarks. |
| Prepared statements | Tested and works well. Writing more tests and benchmarks. |
| PgBouncer compatibility | Make PgDog a drop-in replacement for PgBouncer. Still a work in progress, with a few admin database commands missing. Supported admin database commands are listed [here](administration/index.md). |

## Sharding

Features around query execution in a direct-to-shard or multi-shard context.

| Feature  | Status |
|----------|--------|
| Parsing SQL for sharding keys | Currently parsing SELECTs and INSERTs for sharding keys. Need to parse UPDATE and DELETE queries (same logic as SELECT). Need to add more tests and catch edge cases around queries syntax. |
| Query router | Works well for most queries supported by the parser. Direct-to-shard, multi-shard, and all-shard queries are detected and routed accordingly. |
| Cross-shard queries | Queries spanning multiple shards are supported, for most simple use cases. See below for details. |
| Cross-shard sorting | `SELECT ... ORDER BY ...`-style queries work transparently. Data types supported in the `ORDER BY` clause are: `BIGINT`, `INTEGER`, `TEXT`/`VARCHAR`. Missing: dates/timestamps, other Postgres types. |
| Cross-shard aggregates | Basic aggregates like `count`, `max`, `min`, `sum` are supported with/without `GROUP BY` clause. Missing aggregates include: `avg`, `percentile_cont` (and `disc`), `JSON`, and others. Some require query rewriting. |
| Query rewriting | Rewriting queries is only supported for renaming prepared statements. Query rewriting to support aggregates or cross-shard joins is not yet. |
| Cross-shard joins | Not supported yet. Requires query rewriting and implementing inner/outer hash joins inside PgDog. |

### Data integrity and re-sharding

Features around moving data to/from shards, resharding to scale deployments, and data integrity validation.

| Feature | Status |
|---------|--------|
| Sharded `COPY` | Ingesting data into Postgres using `COPY` and splitting it between shards works. All formats are supported, incl. CSV, text, and binary. More tests are needed to catch edge cases, but we are using a Rust standard CSV library for decoding, which is widely adopted. |
| Logical replication | Partially started. This will use logical replication to move data between shards, while splitting tables between multiple databases. We have code to parse the stream and route messages between shards, but no orchestration or integrity validation yet. |
| Shard re-balancing | Not started yet. See Logical replication above. We'll be creating shards (instances) automatically and moving data between databases. |
| Schema management | Automatic schema management to ensure all shards have identical tables. We have some basic code to read schema off of shards, but it's not actively used yet. |
| Primary key generation | Partially started. Automatic generation of sharded primary keys and non-sharded primary keys. This allows for Postgres to be used for generating primary keys without relying on 3rd party ID servers. We have a function for the sharded primary key. Still have to write one for non-sharded keys (it'll rely on the shard number as well, but won't be hashed). |
| Unique indexes | Not currently supported. Requires query rewriting and separate execution engine to validate uniqueness across all shards. |
| CHECK constraints | Not currently supported. Requires the same functionality as unique indexes. |
