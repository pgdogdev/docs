---
icon: material/account-cog
---

# User configuration

By default, client connections will use password authentication encrypted with SCRAM-SHA-256. This method is secure and recommended for production usage.

PgDog supports using other methods, e.g., `md5`, `plain` and `trust`, which you can change with configuration:

=== "pgdog.toml"

    ```toml
    [general]
    auth_type = "scram" # or "md5", "plain", "trust"
    ```

=== "Helm chart"

    ```yaml
    authType: scram # or "md5", "plain", "trust"
    ```

## Configuring users

The [`users.toml`](../../configuration/users.toml/users.md) configuration file follows a TOML list structure. To allow a user to connect to PgDog, add a `[[users]]` section with the user name, password and a corresponding database name (located in [`pgdog.toml`](../../configuration/pgdog.toml/databases.md)) to `users.toml`, for example:

=== "users.toml"

    ```toml
    [[users]]
    name = "pgdog"
    database = "pgdog"
    password = "hunter2"
    ```

=== "Helm chart"

    ```yaml
    users:
      - name: pgdog
        database: pgdog
        password: hunter2
    ```

The `database` parameter must match the name of one of the databases configured in [`pgdog.toml`](../../configuration/pgdog.toml/databases.md). For example:

=== "users.toml"

    ```toml
    [[users]]
    name = "alice"
    database = "prod"
    password = "hunter2"
    ```

=== "pgdog.toml"

    ```toml
    [[databases]]
    name = "prod"
    host = "10.0.0.1"
    ```

In this example, the `database` parameter in the `[[users]]` **`prod`** entry matches the `[[databases]]` database **`prod`** entry.

!!! warning "User/database mismatch"

    If you add a user with a `database` name not specified in `pgdog.toml`, that entry will be ignored by PgDog at runtime and that user will not be able to connect.

The same username, database name and password will also be used by PgDog to connect to PostgreSQL. This makes configuration simpler since the Postgres connection options used by applications don't have to change when PgDog is deployed for the first time.

Read more about configuring users with password authentication [here](password.md).

## Configuring user options

PgDog supports setting user-specific options in `users.toml`. Some settings are overrides of equivalent global defaults set in the `[general]` section of `pgdog.toml`, while others can be set on users exclusively, for example:

=== "pgdog.toml"

    ```toml
    [[users]]
    name = "pgdog"
    database = "prod"
    password = "hunter2"
    pool_size = 15
    min_pool_size = 5
    ```

=== "Helm chart"

    ```yaml
    users:
      - name: pgdog
        database: prod
        password: hunter2
        poolSize: 15
        minPoolSize: 5
    ```

!!! note "Helm chart"

    Convert the setting name to `camelCase` if using our [Helm chart](../../installation.md#kubernetes).

The following settings are supported:

| User setting             | Global setting           | Description                                                                            |
| ------------------------ | ------------------------ | -------------------------------------------------------------------------------------- |
| `pooler_mode`            | `pooler_mode`            | Transaction or session pooling mode.                                                   |
| `pool_size`              | `default_pool_size`      | Size of the user's connection pool.                                                    |
| `min_pool_size`          | `min_pool_size`          | Minimum number of idle connections in the user's pool.                                 |
| `two_phase_commit`       | `two_phase_commit`       | Enable/disable [two-phase commit](../sharding/2pc/index.md) for this user.             |
| `two_phase_commit_auto`  | `two_phase_commit_auto`  | Enable/disable [automatic](../sharding/2pc/index.md) two-phase-commit for this user.   |
| `server_lifetime`        | `server_lifetime`        | Maximum connection age for this user.                                                  |
| `server_lifetime_jitter` | `server_lifetime_jitter` | Jitter added to `server_lifetime` for this user.                                       |
| `cross_shard_disabled`   | `cross_shard_disabled`   | Disable [cross-shard](../sharding/cross-shard-queries/index.md) queries for this user. |

### User-only settings

In addition to overriding `pgdog.toml` defaults, some settings can only be set on users:

| User setting        | Description                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `statement_timeout` | Equivalent of executing `SET statement_timeout TO <value>` on connection pool creation.        |
| `lock_timeout`      | Equivalent of executing `SET lock_timeout TO <value>` on connection pool creation.             |
| `idle_timeout`      | Clients connected for longer than this (in ms) without executing queries will be disconnected. |

#### Example

=== "users.toml"

    ```toml
    [[users]]
    name = "alice"
    pool_size = 10
    statement_timeout = 15_000
    ```

=== "Helm chart"

    ```yaml
    users:
      - name: alice
        poolSize: 10
        statementTimeout: 15000
    ```

## Read more

{{ next_steps_links([
    ("Password authentication", "/features/auth/password/", "Configure password authentication with SCRAM and other supported algorithms."),
    ("RDS IAM", "/features/auth/rds-iam/", "Passwordless authentication to RDS PostgreSQL and Aurora databases."),
    ("mTLS", "/features/auth/mtls/", "Passwordless authentication for client and server connections."),
]) }}
