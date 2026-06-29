---
icon: material/account-key
---

# Users configuration

This configuration controls which users are allowed to connect to PgDog. This is a TOML list so for each user, add a `[[users]]` section to `users.toml`. For example:

=== "users.toml"
    ```toml
    [[users]]
    name = "alice"
    database = "prod"
    password = "hunter2"

    [[users]]
    name = "bob"
    database = "prod"
    password = "opensesame"
    ```
=== "Helm chart"
    ```yaml
    users:
      - name: alice
        database: prod
        password: hunter2
      - name: bob
        database: prod
        password: opensesame
    ```

### `name`

Name of the user. Clients that connect to PgDog will need to use this username.

Default: **none** (required)

### `database`

Name of the database cluster this user belongs to. This refers to `name` setting in [`pgdog.toml`](../pgdog.toml/databases.md), databases section.

Default: **none** (required)

### `databases`

List of database clusters this user belongs to. Each entry refers to a `name` setting in [`pgdog.toml`](../pgdog.toml/databases.md), databases section. Use this instead of `database` to grant a single user access to more than one database without repeating the `[[users]]` entry.

```toml
[[users]]
name = "alice"
databases = ["prod", "analytics"]
password = "hunter2"
```

Default: **none** (an empty list)

!!! note
    Specify either `database` or `databases`, not both. If both are set, `database` takes priority and `databases` is ignored.

### `all_databases`

Grant this user access to every database defined in [`pgdog.toml`](../pgdog.toml/databases.md). PgDog expands the entry into one user per configured database, creating a separate connection pool for each. This is a convenient way to give a user access to all databases without listing each one in `databases`.

```toml
[[users]]
name = "alice"
all_databases = true
password = "hunter2"
```

Default: **`false`** (disabled)

!!! note
    `all_databases` takes priority over `database` and `databases`. If `all_databases` is set together with either of them, PgDog defaults to all databases and ignores the specific values.

### `password`

The password for the user. Clients will need to provide this when connecting to PgDog.

Default: **none** (required)

!!! note "Settings priority"
    All settings below take priority over values in [`[general]`](../pgdog.toml/general.md) and [`[[databases]]`](../pgdog.toml/databases.md).

### `pool_size`

Overrides [`default_pool_size`](../pgdog.toml/general.md) for this user. No more than this many server connections will be open at any given time to serve requests for this connection pool.

Default: **none** (defaults to `default_pool_size` from `pgdog.toml`)

### `min_pool_size`

Overrides [`min_pool_size`](../pgdog.toml/general.md#min_pool_size) for this user. Opens at least this many connections on pooler startup and keeps them open despite [`idle_timeout`](../pgdog.toml/general.md#idle_timeout).

### `pooler_mode`

Overrides [`pooler_mode`](../pgdog.toml/general.md) for this user. This allows users in [session mode](../../features/connection-pooler/session-mode.md) to connect to the
same PgDog instance as users in [transaction mode](../../features/connection-pooler/transaction-mode.md).

Default: **none** (defaults to `pooler_mode` from `pgdog.toml`)

### `server_user`

Which user to connect with when creating backend connections from PgDog to PostgreSQL. By default, the user configured in `name` is used. This setting allows you to override this configuration and use a different user.

!!! note
    Values specified in `pgdog.toml` take priority over this configuration.

Default: **none** (defaults to `name`)

### `server_password`

Which password to connect with when creating backend connections from PgDog to PostgreSQL. By default, the password configured in `password` is used. This setting allows you to override this configuration and use a different password, decoupling server passwords from user passwords given to clients.

Default: **none** (defaults to `password`)

!!! note
    Values specified in `pgdog.toml` take priority over this configuration.

### `statement_timeout`

Sets the `statement_timeout` on all server connections at connection creation. This allows you to set a reasonable default for each user without modifying `postgresql.conf` or using `ALTER USER`.

!!! note
    Nothing is preventing the user from manually changing this setting at runtime, e.g., by running `SET statement_timeout TO 0`;


### `lock_timeout`

Sets the `lock_timeout` on all server connections at connection creation. Aborts any statement that waits longer than the specified duration to acquire a lock. Unlike `statement_timeout`, this only counts time spent waiting for locks, not total execution time.

Default: **none** (not set)

!!! note
    Nothing is preventing the user from manually changing this setting at runtime, e.g., by running `SET lock_timeout TO 0`;

### `replication_mode`

Sets the `replication=database` parameter on user connections to Postgres. Allows this user to use replication commands.

Default: **`false`** (disabled)

### `idle_timeout`

Overrides [`idle_timeout`](../pgdog.toml/general.md#idle_timeout) for this user. Server connections that have been idle for this long, without affecting [`min_pool_size`](../pgdog.toml/general.md#min_pool_size), will be closed.

Default: **none** (not set)

### `two_phase_commit`

Overrides [`two_phase_commit`](../pgdog.toml/general.md#two_phase_commit) for this user.

Default: **none** (not set)

### `two_phase_commit_auto`

Overrides [`two_phase_commit_auto`](../pgdog.toml/general.md#two_phase_commit_auto) for this user.

Default: **none** (not set)
