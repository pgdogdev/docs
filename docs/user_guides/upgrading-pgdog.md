---
icon: material/update
---

# Upgrading PgDog

PgDog is deployed in front of PostgreSQL. Applications, typically, don't know they are connecting to a proxy. Therefore, PgDog has the same uptime requirements as the database.

To upgrade PgDog versions (released [weekly](https://github.com/pgdogdev/pgdog/blob/main/CHANGELOG.md)), without causing excessive application-side errors, some careful orchestration is needed, as described below.

## The basics

In order to avoid application errors when deploying or restarting PgDog, you need to make sure that app-to-PgDog connections are not interrupted unexpectedly. The most common error you'll see in your logs if this happens is:

```
FATAL: PgDog is shutting down
```

To avoid this error, applications must re-connect to PgDog during the Kubernetes draining period, _before_ the old container is terminated and _after_ the replacement container is started.

The required configuration for this to work exists in two places:

1. Your application's connection pool
2. PgDog's [Helm](../installation.md#kubernetes) chart

Both have to have compatible settings for the deployment rollout to complete smoothly.

## Connection pool configuration

Your application connection pool needs to have a maximum connection lifetime setting (or equivalent). This setting forces the application connection pool to close old connections and re-create them, as needed.

By enforcing this setting, connection pools can gracefully migrate from terminating containers to new containers, without breaking application state.

A few examples of ORMs & web frameworks that have this setting (set to 60 seconds):

=== "psycopg3 (Python)"

    Set [`max_lifetime`](https://www.psycopg.org/psycopg3/docs/api/pool.html#psycopg_pool.ConnectionPool) on a `psycopg_pool.ConnectionPool`:

    ```python
    from psycopg_pool import ConnectionPool

    pool = ConnectionPool(
        "postgresql://app:password@pgdog:6432/app",
        max_lifetime=60,  # in seconds
        open=False,
    )
    ```

=== "SQLAlchemy"

    Set [`pool_recycle`](https://docs.sqlalchemy.org/en/20/core/pooling.html#setting-pool-recycle) when creating the engine:

    ```python
    from sqlalchemy import create_engine, text

    engine = create_engine(
        "postgresql+psycopg://app:password@pgdog:6432/app",
        pool_recycle=60,  # in seconds
        pool_pre_ping=True,
    )
    ```

=== "Ruby on Rails"

    In Rails 8.1 or later, set [`max_age`](https://api.rubyonrails.org/v8.1/classes/ActiveRecord/ConnectionAdapters/ConnectionPool.html) in `config/database.yml`:

    ```yaml
    production:
      adapter: postgresql
      host: pgdog
      port: 6432
      database: app
      username: app
      password: <%= ENV.fetch("DATABASE_PASSWORD") %>
      max_age: 60 # in seconds
    ```

=== "pgx (Go)"

    Set [`MaxConnLifetime`](https://pkg.go.dev/github.com/jackc/pgx/v5/pgxpool#Config) before creating the pool:

    ```go
    import (
        "context"
        "time"

        "github.com/jackc/pgx/v5/pgxpool"
    )

    func main() {
        config, err := pgxpool.ParseConfig("postgresql://app:password@pgdog:6432/app")
        config.MaxConnLifetime = 60 * time.Second
        pool, err := pgxpool.NewWithConfig(context.Background(), config)
    }
    ```

## PgDog Helm chart

!!! note "Kubernetes not required"

    You can still achieve the same outcome even if you're not using our [Helm](../installation.md#kubernetes) chart to deploy PgDog. You'll need to replicate
    the same behavior using your load balancer (e.g., AWS ELB, if using ECS).

The [Helm](../installation.md#kubernetes) chart exposes three relevant settings:

| Setting                         | Description                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `preStopSleepSeconds`           | Number of seconds to wait before sending `SIGINT` to the PgDog process during shutdown.            |
| `shutdownTimeout`               | Number of milliseconds to wait while clients are finishing active transactions.                    |
| `terminationGracePeriodSeconds` | Number of seconds for graceful shutdown of the PgDog process to complete before sending `SIGKILL`. |

### Draining idle clients

In order for graceful shutdown to execute correctly, the maximum connection age in the app's connection pool must be **less than** `preStopSleepSeconds`. If using 60 seconds from the example [above](#connection-pool-configuration), pre-stop waiter should be set to 61 seconds or more, for example:

```yaml title="values.yaml"
preStopSleepSeconds: 63
```

The extra few seconds allow some grace period and for small clock skew between application and PgDog containers.

### Draining in-flight transactions

When the pre-stop timer expires, Kube will send `SIGINT` to PgDog, starting its shutdown sequence, which will wait for any in-flight transactions of connected clients to finish, for up to `shutdownTimeout` milliseconds.

Connection pools don't typically have a configurable setting to enforce maximum transaction time, but Postgres does. To make sure your application doesn't execute transactions spanning longer than `shutdownTimeout`, set the following setting in your Postgres database (PG 17 or later required):

| Setting               | Description                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `transaction_timeout` | Maximum transaction duration, including idle-in-transaction time, before Postgres cancels the transaction and disconnects the client. |

This will make Postgres trigger a recoverable error to your application if their transactions are taking too much time. A corresponding `shutdownTimeout` with a grace period could look like:

```yaml title="values.yaml"
shutdownTimeout: 33000 # 33 seconds
```

The error will be reported to your APM, but the connection pool will also discard and re-create the PgDog connection.

Finally, to ensure the PgDog container is terminated even if none of these timeouts fire correctly, set the `terminationGracePeriodSeconds` to the total sum of `preStopSleepSeconds` and `shutdownTimeout`, with a grace period of its own, for example:

```yaml title="values.yaml"
terminationGracePeriodSeconds: 99
# 63 seconds (pre-stop) + 33 seconds (shutdown timeout) + 3 seconds grace
```

### Complete example

The final configuration could look as follows:

=== "Helm chart"

    ```yaml title="values.yaml"
    preStopSleepSeconds: 63
    shutdownTimeout: 33000
    terminationGracePeriodSeconds: 99
    ```

=== "psycopg3 (Python)"

    ```python
    from psycopg_pool import ConnectionPool

    pool = ConnectionPool(
        "postgresql://app:password@pgdog:6432/app",
        max_lifetime=60,  # in seconds
        kwargs={"options": "-c transaction_timeout=30s"},
    )
    ```

=== "SQLAlchemy"

    ```python
    from sqlalchemy import create_engine

    engine = create_engine(
        "postgresql+psycopg://app:password@pgdog:6432/app",
        pool_recycle=60,  # in seconds
        pool_pre_ping=True,
        connect_args={"options": "-c transaction_timeout=30s"},
    )
    ```

=== "Ruby on Rails"

    ```yaml
    production:
        # [...]
        max_age: 60 # in seconds
        variables:
          transaction_timeout: '30s'
    ```

=== "pgx (Go)"

    ```go
    import (
        "context"
        "time"

        "github.com/jackc/pgx/v5/pgxpool"
    )

    func main() {
        config, err := pgxpool.ParseConfig("postgresql://app:password@pgdog:6432/app")
        config.MaxConnLifetime = 60 * time.Second
        config.ConnConfig.RuntimeParams["transaction_timeout"] = "30s"

        pool, err := pgxpool.NewWithConfig(context.Background(), config)
        defer pool.Close()

        // Run the application using pool.
    }
    ```
