---
icon: material/login
---
# Authentication

PostgreSQL servers support many authentication mechanisms. PgDog supports a subset of those, with the aim to support all of them over time. Since PostgreSQL 14, `scram-sha-256` is widely used to encrypt passwords and PgDog supports this algorithm for both client and server connections.

Authentication is **enabled** by default. Applications connecting to PgDog must provide a username and password which is configured in [`users.toml`](../configuration/users.toml/users.md).


## Supported methods

PgDog implements a subset of authentication methods supported by Postgres. We're continuously working on adding more. The following table summarizes which algorithms are supported for client and server connections.

| Authentication method | Client connections | Server connections |
|-|-|-|
| `scram-sha-256` | :material-check-circle-outline: | :material-check-circle-outline: |
| `scram-sha-256-plus` | No | No |
| `md5` | :material-check-circle-outline: | :material-check-circle-outline: |
| `plain` | Only for [passthrough](#passthrough-authentication) | :material-check-circle-outline: |
| `trust` | :material-check-circle-outline: | :material-check-circle-outline: |

!!! note
    Currently, PgDog uses `md5` authentication with clients that connect over TLS.
    This is due to a potential bug in our SCRAM implementation. See [issue #48](https://github.com/pgdogdev/pgdog/issues/48)
    for updates on this.

### Client authentication

By default, client connections will use `scram-sha-256` for password encryption during the authentication handshake. This method is secure and recommended in production. PgDog does support using others, and you can change it with configuration:

```toml
[general]
auth_method = "scram"
```

Available options currently are:

- `scram` (SCRAM-SHA-256)
- `md5`
- `trust` (No authentication)

### Server authentication

Server authentication method is controlled by PostgreSQL. PgDog will use whatever method Postgres requests during connection creation, which is configurable in [`pg_hba.conf`](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html).


## Add users

`users.toml` follows a simple TOML list structure. To add users, simply add another `[[users]]` section, e.g.:

```toml
[[users]]
name = "pgdog"
database = "pgdog"
password = "hunter2"
```

PgDog will expect clients connecting as `pgdog` to provide the password `hunter2` (hashed with `scram-sha-256` by default), and will use the same username and password to connect to PostgreSQL.

### Override server credentials

You can override the user and/or password PgDog uses to connect to Postgres by specifying `server_user` and `server_password` in the same configuration:

```toml
[[users]]
name = "pgdog"
password = "hunter2"
database = "pgdog"
server_user = "bob"
server_password = "opensesame"
```

This allows you to separate client and server credentials. In case your clients accidentally leak theirs, you only need to rotate them in the PgDog configuration, without having to take downtime to change passwords in PostgreSQL.

## Passthrough authentication

Passthrough authentication is a feature where instead of storing passwords in `users.toml`, PgDog attempts to connect to Postgres using the credentials provided by the client. Passthrough authentication simplifies PgDog deployments by using a single source of truth for authentication and doesn't require passwords to be stored outside the database.

Passthrough authentication is disabled by default and can be enabled with configuration:

```toml
[general]
passthrough_auth = "enabled"
```

This will require clients to send passwords in plain text. PgDog will create a connection pool for the database/user pair and the provided password. The database must exist in [`pgdog.toml`](../configuration/pgdog.toml/databases.md).

The connection pool is dynamic and will be created the first time a client connects. When configuration is reloaded, the connection pool is removed. As long as `passthrough_auth` is enabled between config changes, clients won't be impacted, since connection pools will be recreated next time clients reconnect or execute a query.

### Security

Sending plain text passwords over unencrypted connections isn't ideal, even if PgDog and Postgres are on the same local network. For this reason, `passthrough_auth = "enabled"` will only work if PgDog is configured to use [TLS encryption](tls.md).

If you don't want to set up TLS (it has some impact on latency), you can override this behavior and send passwords via plain text (unsecured) connection:

```toml
[general]
passthrough_auth = "enabled_plain"
```

## Password security

Since PgDog stores passwords in a separate configuration file, it's possible to encrypt it at rest without compromising the DevOps experience. For example, Kubernetes provides built-in [secrets management](https://kubernetes.io/docs/concepts/configuration/secret/) to manage this.
