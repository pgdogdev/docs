
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

## Healthchecks

### `healthcheck_interval`

Frequency of healthchecks performed by PgDog to ensure connections provided to clients from the pool are working.

Default: **`30_000`** (30s)

### `idle_healthcheck_interval`

Frequency of healthchecks performed by PgDog on idle connections. This ensures the database is checked for health periodically when
PgDog receives little to no client requests.

Default: **`30_000`** (30s)

#### Note on `min_pool_size`

[Healthchecks](../../features/healthchecks.md) try to use existing idle connections to validate the database is up and running. If there are no idle connections available, PgDog will create an ephemeral connection to perform the healthcheck. If you want to avoid this, make sure to have `min_pool_size` to be at least `1`.

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

Connectionn pools blocked from serving traffic due to an error will be placed back into active rotation after this long. This ensures
that servers don't stay blocked forever due to healthcheck false positives.

Default: **`300_000`** (5 minutes)

### `shutdown_timeout`

How long to wait for active clients to finish transactions when shutting down. This ensures that PgDog redeployments disrupt as few
queries as possible.

Default: **`60_000`** (60s)

## Load balancer

### `load_balancing_strategy`

Which strategy to use for load balancing read queries. See [load balancer](../../features/load-balancer.md) for more details. Available options are:

* `random`
* `least_active_connections`
* `round_robin`

Default: **`random`**

## Service discovery

### `broadcast_address`

Send multicast packets to this address on the local network. Configuring this setting enables
mutual service discovery. Instances of PgDog running on the same network will be able to see
each other.

Default: **none** (disabled)

### `broadcast_port`

The port used for sending and receiving broadcast messages.

Default: **`6433`**

### `openmetrics_port`

The port used for the OpenMetrics HTTP endpoint.

Default: **unset** (disabled)

### `passthrough_auth`

Toggle automatic creation of connection pools given the user name, database and password. See [authentication](../../features/authentication.md#passthrough-authentication).

Available options are:

- `disabled`
- `enabled`
- `enabled_plain`

Default: **`disabled`**

### `prepared_statements`

Enables support for prepared statements. Available options are:

- `disabled`
- `extended`
- `full`

Full enables support for rewriting prepared statements sent over the simple protocol. Extended handles prepared statements sent normally
using the extended protocol.

Default: **`extended`**

### `query_timeout`

Maximum amount of time to wait for Postgres query to finish executing. Use only in unreliable network conditions or when Postgres runs on unreliable hardware.

Default: **disabled**

### `connect_timeout`

Maximum amount of time to allow for PgDog to create a connection to Postgres.

Default: **`300`** (5s)

### `checkout_timeout`

Maximum amount of time a client is allowed to wait for a connection from the pool.

Default: **`300`** (5s)

### `auth_type`

What kind of authentication mechanism to use for client connections.

Currently supported:

- `scram` (SCRAM-SHA-256)
- `md5` (MD5)

Default: **`scram`**

### `mirror_queue`

Size of requests that can wait while the mirror database processes other requests. Increase this to lose less traffic while replaying, in case the mirror database is slower than production.

Default: **128**
