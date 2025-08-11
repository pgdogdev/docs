
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
virtual CPU. The value `0` means to spawn no threads and use the current thread runtime (single-threaded). The latter option is better on IO-bound systems where multi-threading is not necessary and could even hamper performance.

Default: **`0`** (current thread runtime)

!!! note
    This setting cannot be changed at runtime.

### `default_pool_size`

Default maximum number of server connections per database pool. The pooler will not open more than this many PostgreSQL database connections when serving clients.

Default: **`10`**

### `min_pool_size`

Default minimum number of connections per database pool to keep open at all times. Keeping some connections
open minimizes cold start time when clients connect to the pooler for the first time.

Default: **`1`**


### `pooler_mode`

Default pooler mode to use for database pools. See [Transaction mode](../../features/transaction-mode.md) and [session mode](../../features/session-mode.md) for more details on each mode.

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

[Healthchecks](../../features/load-balancer/healthchecks.md) try to use existing idle connections to validate the database is up and running. If there are no idle connections available, PgDog will create an ephemeral connection to perform the healthcheck. If you want to avoid this, make sure to have `min_pool_size` to be at least `1`.

### `idle_healthcheck_delay`

Delay running idle healthchecks at PgDog startup to give databases (and pools) time to spin up.

Default: **`5_000`** (5s)

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


### `query_timeout`

Maximum amount of time to wait for Postgres query to finish executing. Use only in unreliable network conditions or when Postgres runs on unreliable hardware.

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

## Load balancer

### `load_balancing_strategy`

Which strategy to use for load balancing read queries. See [load balancer](../../features/load-balancer/index.md) for more details. Available options are:

* `random`
* `least_active_connections`
* `round_robin`

Default: **`random`**

### `read_write_split`

How to handle the separation of read and write queries.

Available options:

- `include_primary`
- `exclude_primary`

Include primary uses the primary database as well as the replicas to serve read  queries. Exclude primary will send all read queries to replicas, leaving the primary to serve only writes.

Default: **`include_primary`**

## Service discovery

### `broadcast_address`

Send multicast packets to this address on the local network. Configuring this setting enables
mutual service discovery. Instances of PgDog running on the same network will be able to see
each other.

Default: **none** (disabled)

### `broadcast_port`

The port used for sending and receiving broadcast messages.

Default: **`6433`**

## Monitoring

### `openmetrics_port`

The port used for the OpenMetrics HTTP endpoint.

Default: **unset** (disabled)

### `openmetrics_namespace`

Prefix added to all metric names exposed via the OpenMetrics endpoint.

Default: **none**

## Authentication

### `auth_type`

What kind of authentication mechanism to use for client connections.

Currently supported:

- `scram` (SCRAM-SHA-256)
- `md5` (MD5)

Default: **`scram`**

`md5` is very quick but not secure, while `scram` authentication is slow but has better security features. If security isn't a concern but latency for connection creation is, consider using `md5`.

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
- `full`

Full enables support for rewriting prepared statements sent over the simple protocol. Extended handles prepared statements sent normally
using the extended protocol. `full` attempts to rewrite prepared statements sent over using the simple protocol.

Default: **`extended`**

### `prepared_statements_limit`

Number of prepared statements that will be allowed for each server connection. If this limit is reached, least used statement is closed
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

Enable the query parser in single-shard deployments and record its decisions. Can be used to test compatibility with a future sharded deployment, in production. Routing decisions are available in the query cache, visible by running `SHOW QUERY_CACHE` in the [admin](../administration/index.md) database.

Default: **`false`** (disabled)
