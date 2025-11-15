# Migrating from PgBouncer

PgBouncer is a popular PostgreSQL connection pooler. PgDog implements the majority of its features, which makes the migration process relatively straight forward.

## Configuration

PgBouncer uses the `ini` format for its main config file  and a custom key/value format for user/password list. The main config file is typically called `pgbouncer.ini` and the userlist is aptly called `userlist.txt`.

Both files have an equivalent in PgDog, [`pgdog.toml`](../configuration/pgdog.toml/general.md) and [`users.toml`](../configuration/users.toml/users.md), respectively.

### `pgbouncer.ini`

`pgbouncer.ini` contains the list of databases, in the `[databases]` section, and general settings, in the `[pgbouncer]` section. The analogous for PgDog is [`[[databases]]`](../configuration/pgdog.toml/databases.md) and [`[general]`](../configuration/pgdog.toml/general.md) sections.

### Databases

Databases are a list of PostgreSQL databases proxied by the connection pooler, with database-specific configuration overrides.

#### Example

=== "PgBouncer"
    ```ini
    prod = host=10.0.0.1 port=5432 user=postgres
    staging = host=10.0.0.2 port=5433 user=postgres
    ```

=== "PgDog"
    ```toml
    [[databases]]
    name = "prod"
    host = "10.0.0.1"
    port = 5432

    [[databases]]
    name = "staging"
    host = "10.0.0.1"
    port = 5432
    ```

    !!! note "Configuring users"
        Unlike PgBouncer, PgDog connection pool users are configured separately in [`users.toml`](../configuration/users.toml/users.md).

#### Overrides

Both PgBouncer and PgDog can override the user's password used to connect to PostgreSQL.

=== "PgBouncer"
    ```ini
    prod = host=10.0.0.1 port=5432 user=postgres password=hunter2 pool_mode=transaction
    ```
=== "PgDog"
    ```toml
    [[databases]]
    name = "prod"
    host = "10.0.0.1"
    port = 5432
    server_user = "postgres"
    server_password = "hunter2"
    pooler_mode = "transaction"
    ```

### General settings

The `[pgbouncer]` section is a catch-all for all other configuration options that tweak its internal operations. For example, it allows to configure connection pool sizes, timeouts and logging settings.

PgDog follows the same principles and has a [`[general]`](../configuration/pgdog.toml/general.md) section for the same purpose.

#### Example

=== "PgBouncer"
    ```ini
    [pgbouncer]
    listen_addr = 127.0.0.1
    listen_port = 6432
    default_pool_size = 100
    pool_mode = transaction
    ```

=== "PgDog"
    ```toml
    [general]
    host = "127.0.0.1"
    port = 6432
    default_pool_size = 100
    pooler_mode = "transaction"
    ```

#### Supported settings

Below is a list of PgBouncer settings and features PgDog exposes via its own configuration.

Only the most common settings are listed. The ones that are not are either not currently supported or don't apply to how PgDog operates.

##### Generic settings

Settings that control general connection pooler operations.

| PgBouncer | PgDog | Notes |
|-|-|-|
| `listen_addr` | `host` | PgDog doesn't support UNIX sockets. |
| `listen_port` | `port` | - |
| `default_pool_size` | `default_pool_size` | - |
| `min_pool_size` | `min_pool_size` | - |
| `reserve_pool_size` | N/A | PgDog doesn't support reserve connection pools. |
| `pool_mode` | `pooler_mode` | PgDog doesn't currently support statement mode. |
| `max_client_conn` | N/A | PgDog doesn't place an upper bound on the number of client connections. |
| `max_db_connections` | N/A | PgDog doesn't have a global database connection limit. Individual pools configure their own limits. |
| `server_round_robin` | N/A | PgDog has its own [load balancing](../features/load-balancer/index.md) algorithms that are configured separetly. |
| `track_extra_parameters` | N/A | PgDog tracks [all parameters](../features/transaction-mode.md#session-state) by default, including those that PgBouncer doesn't. |
| `stats_period` | `stats_period` | - |
| `max_prepared_statements` | `prepared_statements_limit` | PgDog's [prepared statements](../features/prepared-statements.md) limit is soft and is only enforced on server connections. |

##### Authentication settings

Settings that control how clients and server connections authenticate.

| PgBouncer | PgDog | Notes |
|-|-|-|
| `auth_type` | `auth_type` | PgDog supports only a subset of [authentication](../features/authentication.md) mechanisms.
| `auth_file` | N/A | The path to `users.toml` can be passed in as a CLI argument on startup: `--users <PATH>`. |
| `log_connections` | `log_connections` | - |
| `log_disconnections` | `log_disconnections` | - |

##### Administration settings

Settings that control admin database access.

| PgBouncer | PgDog | Notes |
|-|-|-|
| `admin_users` | N/A | Admin users are configured separately in the [`[admin]`](../configuration/pgdog.toml/admin.md) section. |
| `stats_users` | N/A | There is no distinction between admin users and stats users in PgDog. |

##### Connection checks

Various connection-related and DNS-related settings.

| PgBouncer | PgDog | Notes |
|-|-|-|
| `server_reset_query` | N/A | Server state is [managed](../features/transaction-mode.md#session-state) by PgDog and different reset queries are used, depending on circumstances. |
| `server_check_query` | N/A | Not currently configurable. PgDog runs an empty query (`;`) by default. |
| `server_lifetime` | `server_lifetime` | - |
| `server_idle_timeout` | `idle_timeout` | - |
| `server_connect_timeout` | `connect_timeout` | - |
| `server_login_retry` | `connect_attempt_delay` | PgDog can retry server connections for any error, not just authentication. |
| `client_login_timeout` | `client_login_timeout` | - |
| `dns_max_ttl` | `dns_ttl` | - |

##### TLS

Settings that control how client and server connections use TLS.

| PgBouncer | PgDog | Notes |
|-|-|-|
| `client_tls_sslmode` | `tls_client_required` | Boolean setting in PgDog only. `true` forces clients to use TLS, `false` doesn't. |
| `client_tls_key_file` | `tls_private_key` | - |
| `client_tls_cert_file` | `tls_certificate` | - |
| `client_tls_ca_file` | N/A | mTLS is not currently supported in PgDog. |
| `client_tls_protocols` | N/A | Only modern and secure protocols are supported. |
| `client_tls_ciphers` | N/A | Same as above. |
| `server_tls_sslmode` | `tls_verify` | Read more in [TLS](../features/tls.md#server-connections). |
| `server_tls_ca_file` | `tls_server_ca_certificate` | Same as above. |
| `server_tls_key_file` | N/A | PgDog doesn't support mTLS for server connections. |
| `server_tls_cert_file` | N/A | Same as above. |
| `server_tls_protocols` | N/A | Same as `client_tls_protocols`. Only secure procotols are supported. |
| `server_tls_ciphers` | N/A | Same as above. |

##### Dangerous timeouts

Settings that can abort queries mid-transaction or forcibly close client or server connections.

| PgBouncer | PgDog | Notes |
|-|-|-|
| `query_timeout` | `query_timeout` | - |
| `query_wait_timeout` | `checkout_timeout` | - |
| `client_idle_timeout` | `client_idle_timeout` | - |
| `idle_transaction_timeout` | N/A | Not currently supported in PgDog. |
| `transaction_timeout` | N/A | Same as above. |

##### TCP settings

Low-level network settings controlling how TCP works.

| PgBouncer | PgDog | Notes |
|-|-|-|
| `tcp_keepalive` | `keepalive` | Read more in [Network](../configuration/pgdog.toml/network.md) settings. |
| `tcp_keepcnt` | `retries` | Same as above. |
| `tcp_keepidle` | `time` | Same as above. |
| `tcp_keepintvl` | `interval` | Same as above. |
| `tcp_user_timeout` | `user_timeout` | Same as above. |
