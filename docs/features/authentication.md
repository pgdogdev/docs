# Authentication

PostgreSQL servers support many authentication mechanisms. PgDog supports a subset of those, with the aim to support all of them over time. Since PostgreSQL 14, `SCRAM-SHA-256` is widely used to encrypt passwords and PgDog supports this algorithm for both client and server connections.

Authentication is **enabled** by default. Applications connecting to PgDog must provide a username and password which is [configured](../configuration/users.toml/users.md) in `users.toml`. For connecting to PostgreSQL databases,
PgDog currently supports only `SCRAM-SHA-256`.

!!! note
    Currently, PgDog uses MD5 authentication with clients that connect over TLS.
    This is due to a potential bug in our SCRAM implementation. See [issue #48](https://github.com/pgdogdev/pgdog/issues/48)
    for updates on this.


## Add users

`users.toml` follows a simple TOML list structure. To add users, simply add another `[[users]]` section, e.g.:

```toml
[[users]]
name = "pgdog"
database = "pgdog"
password = "hunter2"
```

PgDog will expect clients connecting as `pgdog` to provide the password `hunter2` (hashed with `SCRAM-SHA-256`), and will use the same username and password to connect to PostgreSQL.

#### Override server credentials

You can override the user and/or
password PgDog uses to connect to Postgres by specifying `server_user` and `server_password` in the same configuration:

```toml
server_user = "bob"
server_password = "opensesame"
```

This allows to separate client and server credentials. In case your clients accidentally leak theirs, you only need to rotate them in the PgDog configuration, without having to take downtime to change passwords in PostgreSQL.

## Passthrough authentication

Passthrough authentication is a feature where instead of storing passwords in `users.toml`, PgDog attempts to connect to Postgres using the credentials provided by the client. Passthrough authentication simplifies PgDog deployments by using a single source of truth for authentication and doesn't require passwords to be stored outside the database.

Passthrough authentication is disabled by default and can be enabled with configuration:

```toml
[general]
passthrough_auth = "enabled"
```

This will require clients to send passwords in plain text. PgDog will create a connection pool for the database/user pair and the provided password. The database must exist in `pgdog.toml`.

The connection pool is dynamic and will be removed when PgDog is restarted. As long as `passthrough_auth` is enabled between config changes, clients shouldn't be impacted, since connection pools will be recreated next time clients reconnect or execute a query.

### Security

Sending plain text passwords over unencrypted connections isn't great, even if PgDog and Postgres are on the same local network. For this reason, `passthrough_auth = "enabled"` will only work if PgDog is configured to use TLS encryption. If you want to override this and send passwords in plain text, set `passthrough_auth` to `"enable_plain"`.

## Password security

Since PgDog stores passwords in a separate configuration file, it's possible to encrypt it at rest without compromising the DevOps experience. For example, Kubernetes provides built-in [secrets management](https://kubernetes.io/docs/concepts/configuration/secret/) to manage this.
