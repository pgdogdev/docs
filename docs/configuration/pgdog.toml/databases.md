---
icon: material/database-settings
---

# Database settings

Database settings configure which databases PgDog is managing. This is a TOML list of hosts, ports, and other settings like database roles (primary or replica).

For each database instance, add a `[[databases]]` entry to `pgdog.toml`. For example:

=== "pgdog.toml"

    ```toml
    [[databases]]
    name = "prod"
    host = "10.0.0.1"
    port = 5432
    shard = 0

    [[databases]]
    name = "prod"
    host = "10.0.0.2"
    port = 5432
    role = "replica"
    shard = 0
    ```

=== "Helm chart"

    ```yaml
    databases:
      - name: prod
        host: 10.0.0.1
        port: 5432
        shard: 0
      - name: prod
        host: 10.0.0.2
        port: 5432
        role: replica
        shard: 0
    ```

### `name`

Name of your database. Clients that connect to PgDog will need to use this name to refer to the database. For multiple entries that are part of
the same cluster, use the same value.

Default: **none** (required)

### `host`

IP address or DNS name of the machine where the PostgreSQL server is running. For example:

- `10.0.0.1`
- `localhost`
- `prod-primary.local-net.dev`

Default: **none** (required)

### `port`

The port PostgreSQL is running on. More often than not, this is going to be `5432`.

Default: **`5432`**

### `role`

Type of role this host performs in your database cluster. This can be `primary` for primary databases that serve writes (and reads), `replica` for PostgreSQL replicas that can only serve reads, or `auto` to let PgDog decide (see [failover](../../features/load-balancer/replication-failover.md#failover) for more details).

Default: **`primary`**

### `database_name`

Name of the PostgreSQL database on the server PgDog will connect to. If not set, this defaults to `name`.

Default: **none** (defaults to `name`)

### `user`

Name of the PostgreSQL user to connect with when creating backend connections from PgDog to Postgres. If not set, this defaults to `name` in [`users.toml`](../users.toml/users.md). This setting is used to override `users.toml` configuration values.

Default: **none** (see [`users.toml`](../users.toml/users.md))

### `password`

Password to use when creating backend connections to PostgreSQL. If not set, this defaults to `password` in [`users.toml`](../users.toml/users.md). This setting is used to override `users.toml` configuration values.

Default: **none** (see [`users.toml`](../users.toml/users.md))

### `shard`

The shard number for this database. Only required if your database contains more than one shard. Shard numbers start at 0.

Default: **`0`**

### `lb_weight`

Relative weight used when [`load_balancing_strategy`](general.md#load_balancing_strategy) is `weighted_round_robin`. Higher weights receive a larger share of read traffic among eligible servers.

For example, weights of `200` and `100` give the first server approximately twice as much traffic as the second.

Accepts integers from `0` to `255`. This setting has no effect with other load balancing strategies.

Default: **`255`**

### `resharding_only`

Reserve this server for [resharding](../../features/sharding/resharding/index.md) table copying only. They are excluded it from normal read load balancing.

Default: **`false`**

!!! note "Settings priority"

    Database pool settings override the corresponding defaults in [`[general]`](general.md). Per-user pool settings in [`users.toml`](../users.toml/users.md) take priority over the corresponding database settings.

### `pool_size`

Overrides the [`default_pool_size`](general.md#default_pool_size) setting. All connection pools for this database will open at most this many connections to Postgres.

!!! note "Recommendation"

    It's recommended to keep this value below the supported connections of the backend database(s) to allow connections for maintenance in high load scenarios.

### `pooler_mode`

Overrides the [`pooler_mode`](general.md#pooler_mode) setting. Connections to this database will use this connection pool mode.

### `min_pool_size`

Overrides the [`min_pool_size`](general.md#min_pool_size) setting. The connection pool will maintain at minimum this many connections.

### `statement_timeout`

This setting configures the `statement_timeout` connection parameter on all connections to Postgres for this database.

### `lock_timeout`

Configures the `lock_timeout` connection parameter on all connections to Postgres for this database. Aborts any statement that waits longer than the specified duration to acquire a lock. Unlike `statement_timeout`, this only counts time spent waiting for locks, not total execution time.

Default: **none** (not set)

### `idle_timeout`

Overrides the [`idle_timeout`](general.md#idle_timeout) setting. Idle server connections exceeding this timeout will be closed automatically.

### `read_only`

Sets the `default_transaction_read_only` connection parameter to `on` on all server connections to this database. Clients can still override it with `SET`.

### `server_lifetime`

Overrides the [`server_lifetime`](general.md#server_lifetime) setting. Server connections older than this will be closed when returned to the pool.

### `server_lifetime_jitter`

Overrides [`server_lifetime_jitter`](general.md#server_lifetime_jitter) for this database, in milliseconds.

Default: **none**

## Pool settings by role

These settings apply according to the server's current role, e.g., `primary` or `replica`.

They are useful with `role = "auto"`, since the applicable limits change when PgDog detects a role change.

### `pool_size_primary`

Maximum number of connections per pool when this server is a primary. Overrides the ordinary [`pool_size`](#pool_size) limit for that role.

Default: **none**

### `pool_size_replica`

Maximum number of connections per pool when this server is a replica. Overrides the ordinary [`pool_size`](#pool_size) limit for that role.

Default: **none**

### `min_pool_size_primary`

Minimum number of connections to keep open per pool when this server is a primary. Overrides the ordinary [`min_pool_size`](#min_pool_size) for that role.

Default: **none**

### `min_pool_size_replica`

Minimum number of connections to keep open per pool when this server is a replica. Overrides the ordinary [`min_pool_size`](#min_pool_size) for that role.

Default: **none**

### `idle_timeout_primary`

Idle connection timeout, in milliseconds, when this server is a primary. Overrides the ordinary [`idle_timeout`](#idle_timeout) for that role.

Default: **none**

### `idle_timeout_replica`

Idle connection timeout, in milliseconds, when this server is a replica. Overrides the ordinary [`idle_timeout`](#idle_timeout) for that role.

Default: **none**

For example:

```toml
[[databases]]
name = "prod"
host = "10.0.0.1"
role = "auto"
pool_size_primary = 20
pool_size_replica = 10
min_pool_size_primary = 2
min_pool_size_replica = 1
idle_timeout_primary = 60_000
idle_timeout_replica = 30_000
```

## TLS

These settings control TLS connections from PgDog to this PostgreSQL server. Add them directly to the `[[databases]]` entry. Unset settings inherit the corresponding values from `[general]`.

### `tls_verify`

Overrides [`tls_verify`](general.md#tls_verify) for this server. Available options are:

- `disabled`: disable TLS.
- `prefer`: use TLS if available, without verifying the server certificate.
- `verify_ca`: validate the server certificate against a CA bundle.
- `verify_full`: validate the server certificate and its hostname.

Default: **none**

### `tls_server_ca_certificate`

Path to the CA certificate bundle used to validate this server's certificate. Overrides [`tls_server_ca_certificate`](general.md#tls_server_ca_certificate); use with `verify_ca` or `verify_full`.

Default: **none**

### `tls_server_certificate`

Path to the PEM client certificate PgDog presents to this server for mutual TLS (mTLS). Set [`tls_server_private_key`](#tls_server_private_key) in the same database entry. Together, these replace the certificate and key configured in `[general]`.

Default: **none**

### `tls_server_private_key`

Path to the PEM private key for [`tls_server_certificate`](#tls_server_certificate). Both settings must be provided together on the database.

Default: **none**
