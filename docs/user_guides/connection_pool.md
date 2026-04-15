---
icon: material/pipe
---

# Connection pools configuration

When deploying a connection pooler for the first time, it can be challenging to know how many connections to provision for each [connection pool](../configuration/pgdog.toml/general.md#default_pool_size). The goal of using a connection pooler, like PgDog, is to reduce the total number of database connections by taking advantage of [transaction mode](../features/transaction-mode.md).

Sizing up the right value for that setting depends on your database, but follows a few general principles.

## One pool per user

PgDog creates one, independent, connection pool for each user entry in [`users.toml`](../configuration/users.toml/users.md). If the [`pool_size`](../configuration/users.toml/users.md#pool_size) setting is not specified, it will use [`default_pool_size`](../configuration/pgdog.toml/general.md#default_pool_size) instead.

This property is important to keep in mind, since adding several users will increase the maximum possible connection count on the database.

### Estimating the pool size

To get the right setting for `default_pool_size` (or `pool_size`), take the current peak database connection count on your database and divide it by the number of users in `users.toml`. This will give PgDog the ability to open, _at most_, that number of connections, if needed.

Transaction mode connection re-use will bring that number down pretty quickly, but setting it that high to start with helps prevent any edge cases, e.g., slow queries, from starving the pool.

If you don't have reliable statistics for peak database usage, use the [`max_connections`](https://www.postgresql.org/docs/current/runtime-config-connection.html#GUC-MAX-CONNECTIONS) setting from `postgresql.conf`.

#### The formula

```
default_pool_size = max_connections / <number of users>
```

| Argument | Description |
|-|-|
| `default_pool_size` | Maximum number of connections PgDog can open to the database _per_ user in `users.toml`. |
| `max_connections` | Maximum number of connections configured in the database. PgDog won't be able to open more connections than this setting. |
| `<number of users>` | Number of entries in `users.toml`. |
