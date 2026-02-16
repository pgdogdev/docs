---
icon: material/filter-cog
---

# General settings

General settings are relevant to the operations of the pooler itself, or apply to all database pools.

### `host`

The IP address of the local network interface PgDog will bind to listen for connections.

!!! note
    This setting cannot be changed at runtime.

Default: **`0.0.0.0`** (all interfaces)

### `port`

The TCP port PgDog will bind to listen for connections.

Default: **`6432`**

!!! note
    This setting cannot be changed at runtime.

### `workers`

Number of Tokio threads to spawn at pooler startup. In multi-core systems, the recommended setting is two (2) per
virtual CPU. The value `0` means to spawn no threads and use the current thread runtime (single-threaded). This option is better on IO-bound systems where multi-threading is not necessary and could even hamper performance.

Default: **`2`**

!!! note
    This setting cannot be changed at runtime.

### `default_pool_size`

Default maximum number of server connections per database pool. The pooler will not open more than this many PostgreSQL database connections when serving clients.

!!! note "Recommendation"
    We strongly recommend keeping this value well below the supported connections of the backend database(s) to allow connections for maintenance in high load scenarios.

Default: **`10`**

### `min_pool_size`

Default minimum number of connections per database pool to keep open at all times. Keeping some connections
open minimizes cold start time when clients connect to the pooler for the first time.

Default: **`1`**


### `pooler_mode`

Default pooler mode to use for database pools.

Available options:

- `session`
- `transaction` (default)
- `statement`


See [transaction mode](../../features/transaction-mode.md) and [session mode](../../features/session-mode.md) for more details on each mode.

Default:  **`transaction`**

## TLS

### `tls_certificate`

Path to the TLS certificate PgDog will use to setup TLS connections with clients. If none is provided, TLS will be disabled.

Default: **none**

!!! note
    This setting cannot be changed at runtime.

### `tls_private_key`

Path to the TLS private key PgDog will use to setup TLS connections with clients. If none is provided, TLS will be disabled.

Default: **none**

!!! note
    This setting cannot be changed at runtime.

### `tls_client_required`

Reject clients that connect without TLS. Consider setting this to `true` when using the `enabled_plain` mode of [`passthrough_auth`](#passthrough_auth).

Default: **`false`** (disabled)

### `tls_verify`

How to handle TLS connections to Postgres servers. By default, PgDog will attempt to establish TLS and will accept _any_ server certificate.

Default: **`prefer`**

Available options are:

* `none` (disable TLS)
* `prefer` (no certificate validation)
* `verify_ca` (validate certificate only)
* `verify_full` (validate certificate _and_ matching hostname)

!!! note
    This setting cannot be changed at runtime.

### `tls_server_ca_certificate`

Path to a certificate bundle used to validate the server certificate on TLS connection creation. Used in conjunction with `verify_ca` or `verify_full` in [`tls_verify`](#tls_verify).

!!! note
    This setting cannot be changed at runtime.


## Healthchecks

### `healthcheck_interval`

Frequency of healthchecks performed by PgDog to ensure connections provided to clients from the pool are working.

Default: **`30_000`** (30s)

### `idle_healthcheck_interval`

Frequency of healthchecks performed by PgDog on idle connections. This ensures the database is checked for health periodically when
PgDog receives little to no client requests.

Default: **`30_000`** (30s)

#### Note on `min_pool_size`

[Healthchecks](../../features/load-balancer/healthchecks.md) try to use existing idle connections to validate the database is up and running. If there are no idle connections available, PgDog will create an ephemeral connection to perform the healthcheck. If you want to avoid this, make sure to set `min_pool_size` to at least `1`.

### `idle_healthcheck_delay`

Delay running idle healthchecks at PgDog startup to give databases (and pools) time to spin up.

Default: **`5_000`** (5s)

### `healthcheck_timeout`

Maximum amount of time to wait for a healthcheck query to complete.

Default: **`5_000`** (5s)

### `connection_recovery`

Controls if server connections are recovered or dropped if a client abruptly disconnects.

Available options:

- `recover` (default)
- `rollback_only`
- `drop`

`rollback_only` will only attempt to `ROLLBACK` any unfinished transactions but won't attempt to resynchronize connections. `drop` will close connections, without attempting recovery.

### `client_connection_recovery`

Controls whether to disconnect clients upon encountering connection pool errors (e.g., checkout timeout). Set this to `drop` if your clients are async / use pipelining mode.

Available options:

- `recover` (default)
- `drop`


## Timeouts

These settings control how long PgDog waits for maintenance tasks to complete. These timeouts make sure PgDog can recover
from abnormal conditions like hardware failure.

### `rollback_timeout`

How long to allow for `ROLLBACK` queries to run on server connections with unfinished transactions. See [transaction mode](../../features/transaction-mode.md) for more details.

Default: **`5_000`** (5s)

### `ban_timeout`

Connection pools blocked from serving traffic due to an error will be placed back into active rotation after this long. This ensures
that servers don't stay blocked forever due to healthcheck false positives.

Default: **`300_000`** (5 minutes)

### `shutdown_timeout`

How long to wait for active clients to finish transactions when shutting down. This ensures that PgDog redeployments disrupt as few
queries as possible.

Default: **`60_000`** (60s)

### `shutdown_termination_timeout`

How long to wait for active connections to be forcibly terminated after `shutdown_timeout` expires. If set, PgDog will send `CANCEL` requests to PostgreSQL for any remaining active queries before tearing down connection pools. This prevents long-running queries from lingering after shutdown begins.

Default: **disabled**

### `query_timeout`

Maximum amount of time to wait for a Postgres query to finish executing. Use only in unreliable network conditions or when Postgres runs on unreliable hardware.

Default: **disabled**

### `connect_timeout`

Maximum amount of time to allow for PgDog to create a connection to Postgres.

Default: **`300`** (5s)

### `connect_attempts`

Maximum number of retries for Postgres server connection attempts. When exceeded, an error is returned to the pool
and the pool will be banned from serving more queries.

Default: **`1`**

### `connect_attempt_delay`

Amount of time to wait between connection attempt retries.

Default: **`0`** (0ms)

### `checkout_timeout`

Maximum amount of time a client is allowed to wait for a connection from the pool.

Default: **`300`** (5s)

### `idle_timeout`

Close server connections that have been idle, i.e., haven't served a single client transaction, for this amount of time.

Default: **`60_000`** (60s)

### `client_idle_timeout`

Close client connections that have been idle, i.e., haven't sent any queries, for this amount of time.

Default: **`none`** (disabled)

### `client_idle_in_transaction_timeout`

Close client connections that have been idle inside a transaction for this amount of time. This prevents clients from holding server connections indefinitely while in a transaction.

Default: **`none`** (disabled)

### `client_login_timeout`

Maximum amount of time new clients have to complete authentication. Clients that don't will be disconnected.

Default: **`60_000`** (60s)

### `server_lifetime`

Maximum amount of time a server connection is allowed to exist. Any connections exceeding this limit will be closed once they are checked back into the pool.

Default: **`86400000`** (24h)

## Load balancer

### `load_balancing_strategy`

Which strategy to use for load balancing read queries. See [load balancer](../../features/load-balancer/index.md) for more details. Available options are:

* `random`
* `least_active_connections`
* `round_robin`

Default: **`random`**

### `read_write_strategy`

How aggressive the query parser should be in determining read vs. write queries.

Available options:

- `conservative` (default): transactions are writes, standalone `SELECT` are reads
- `aggressive`: use first statement inside a transaction for determining query route

Default: **`conservative`**

### `read_write_split`

How to handle the separation of read and write queries.

Available options:

- `include_primary`
- `exclude_primary`
- `include_primary_if_replica_banned`

`include_primary` uses the primary database as well as the replicas to serve read queries. `exclude_primary` will send all read queries to replicas, leaving the primary to serve only writes.

`include_primary_if_replica_banned` strategy will only send reads to the primary if one or more replicas have been banned. This is useful in case you want to use the primary as a failover for reads.

Default: **`include_primary`**

### `healthcheck_port`

Enable load balancer [HTTP health checks](../../features/load-balancer/healthchecks.md#load-balancer-health-check) with the HTTP server running on this port.

Default: **none** (disabled)


## Monitoring

### `openmetrics_port`

The port used for the OpenMetrics HTTP endpoint.

Default: **none** (disabled)

### `openmetrics_namespace`

Prefix added to all metric names exposed via the OpenMetrics endpoint.

Default: **none**

## Authentication

### `auth_type`

What kind of [authentication](../../features/authentication.md) mechanism to use for client connections.

Currently supported:

- `scram` (SCRAM-SHA-256)
- `md5` (MD5)
- `trust`

Default: **`scram`**

`md5` is very quick but not secure, while `scram` authentication is slow but has better security features. If security isn't a concern but latency for connection creation is, consider using `md5`. To disable auth and allow passwordless connections, use `trust`.

### `passthrough_auth`

Toggle automatic creation of connection pools given the user name, database and password. See [passthrough authentication](../../features/authentication.md#passthrough-authentication).

Available options are:

- `disabled`
- `enabled`
- `enabled_plain`

Default: **`disabled`**

## Prepared statements

### `prepared_statements`

Enables support for prepared statements. Available options are:

- `disabled`
- `extended`
- `extended_anonymous`
- `full`

`full` enables support for rewriting prepared statements sent over the simple protocol. `extended` handles prepared statements sent normally
using the extended protocol. `extended_anonymous` caches and rewrites unnamed prepared statements, which is useful for some legacy client drivers.

Default: **`extended`**

### `prepared_statements_limit`

Number of prepared statements that will be allowed for each server connection. If this limit is reached, the least used statement is closed
and replaced with the newest one. Additionally, any unused statements in the [global cache](../../features/prepared-statements.md) above this
limit will be removed.

Default: **`none`** (unlimited)

## Pub/sub

### `pub_sub_channel_size`

Enables support for [pub/sub](../../features/pub_sub.md) and configures the size of the background task queue.

Default: **`none`** (disabled)

## Mirroring

### `mirror_queue`

How many transactions can wait while the mirror database processes previous requests. Increase this to lose less traffic while replaying, in case the mirror database is slower than production.

Default: **`128`**

### `mirror_exposure`

How many transactions to send to the mirror as a fraction of regular traffic. Acceptable value is a floating point number between 0.0 (0%) and 1.0 (100%).

Default: **`1.0`**

## Sharding

### `dry_run`

Enable the query parser in single-shard deployments and record its decisions. Can be used to test compatibility with a future sharded deployment in production. Routing decisions are available in the query cache, visible by running `SHOW QUERY_CACHE` in the [admin](../../administration/index.md) database. See [dry run mode](../../features/sharding/dry-run.md) for more details.

Default: **`false`** (disabled)

### `two_phase_commit`

Enable [two-phase commit](../../features/sharding/2pc.md) for write, cross-shard transactions.

Default: **`false`** (disabled)

### `two_phase_commit_auto`

Enable automatic conversion of single-statement write transactions to use [two-phase commit](../../features/sharding/2pc.md).

Default: **`true`** (enabled)

### `query_cache_limit`

Limit on the number of statements saved in the statement cache used to accelerate query parsing. The saved statements are visible by running the `SHOW QUERY_CACHE` in the [admin database](../../administration/index.md).

Default: **`50_000`**

### `query_parser_enabled`

!!! warning "Deprecated setting"
    This setting is deprecated. Use [`query_parser`](#query_parser) instead.

Force-enable query parsing to take advantage of its features in non-sharded databases, like [advisory locks](../../features/transaction-mode.md#advisory-locks) or managing [session state](../../features/transaction-mode.md#session-state).

### `query_parser`

Toggle the query parser to enable/disable query parsing and all of its benefits. By default, the query parser is turned on automatically, so only disable it if you know what you're doing.

Available options:

- `on` (enabled)
- `off` (disabled)
- `auto` (automatically enabled or disabled, depending on database configuration)

Default: **`auto`**

### `system_catalogs`

Changes how system catalog tables (like `pg_database`, `pg_class`, etc.) are treated by the query router. Default behavior is to assume they are the same on all shards and send queries referencing them to a random shard. This makes tools like `psql` work out of the box.

Available options:

- `omnisharded`
- `omnisharded_sticky` (default)
- `sharded`

Default: **`omnisharded_sticky`** (enabled)

### `omnisharded_sticky`

If turned on, queries touching [omnisharded](../../features/sharding/omnishards.md) tables are always sent to the same shard for any given client connection. The shard is determined at random on connection creation.

Default: **`false`**

### `resharding_copy_format`

Which format to use for `COPY` statements during [resharding](../../features/sharding/resharding/index.md).

Available options:

- `binary` (default)
- `text`

`text` format is required when migrating from `INTEGER` to `BIGINT` primary keys during resharding.

### `reload_schema_on_ddl`

!!! warning
    This setting requires [PgDog Enterprise Edition](../../enterprise_edition/index.md) to work as expected. If using the open source edition,
    it will only work with single-node PgDog deployments, e.g., in local development or CI.

Automatically reload the schema cache used by PgDog to route queries upon detecting DDL statements (e.g., `CREATE TABLE`, `ALTER TABLE`, etc.).

Default: **`true`** (enabled)

### `load_schema`

Controls whether PgDog loads the database schema at startup for query routing.

Available options:

- `on`: always load schema on startup
- `off`:  disable loading schema
- `auto` (default): load schema if number of database shards is greater than 1

Default: **`auto`**

## Logging

### `log_connections`

If enabled, log every time a user creates a new connection to PgDog.

Default: **`true`** (enabled)

### `log_disconnections`

If enabled, log every time a user disconnects from PgDog.

Default: **`true`** (enabled)

## Statistics

### `stats_period`

How often to calculate averages shown in `SHOW STATS` [admin](../../administration/index.md) command and the [Prometheus](../../features/metrics.md) metrics.

Default: **`15_000`** (15s)

## DNS

### `dns_ttl`

Overrides the TTL set on DNS records received from DNS servers. Allows for faster failover when the primary/replica hostnames are changed by the database hosting provider.

Default: **none** (disabled)

## Replication

### `lsn_check_delay`

For how long to delay checking for [replication delay](../../features/load-balancer/replication-failover.md).

Default: **`infinity`** (disabled)

### `lsn_check_interval`

How frequently to run the [replication delay](../../features/load-balancer/replication-failover.md) check.

Default: **`5_000`** (5s)

### `lsn_check_timeout`

Maximum amount of time allowed for the [replication delay](../../features/load-balancer/replication-failover.md) query to return a result.

Default: **`5_000`** (5s)
