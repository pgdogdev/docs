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

    Keep the pool open for the application's lifetime. Expired connections are replaced when returned to the pool.

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

    Reuse the engine across requests. SQLAlchemy replaces expired connections on their next checkout. `pool_pre_ping` also checks for disconnected connections before handing them to the application. Neither setting protects a connection held by a long-running request or transaction.

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

!!! note "No Kubernetes"

    You can still achieve the same outcome even if you're not using our [Helm](../installation.md#kubernetes) chart to deploy PgDog.

The [Helm](../installation.md#kubernetes) chart exposes three relevant settings:

| Setting                         | Description                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `preStopSleepSeconds`           | Number of seconds to wait before sending `SIGINT` to the PgDog process during shutdown.                 |
| `shutdownTimeout`               | Number of milliseconds to wait while clients are finishing up active transactions.                      |
| `terminationGracePeriodSeconds` | Number of seconds to allow graceful shutdown of the PgDog process to complete before sending `SIGKILL`. |

In order for graceful shutdown to execute correctly, the maximum connection age in the app's connection pool must be **less than** `preStopSleepSeconds`. If using 60 seconds from the example [above](#connection-pool-configuration), pre-stop waiter should be set to 61 seconds or more:

```yaml title="values.yaml"
preStopSleepSeconds: 63
```

The extra few seconds allow some grace period and for small clock skew between application and PgDog containers.

When the pre-stop timer expires, Kube will send `SIGINT` to PgDog, starting its shutdown sequence, which will wait for any in-flight transactions of connected clients to finish for up to `shutdownTimeout` milliseconds.

Connection pools don't typically have a configurable setting to enforce maximum transaction time, but Postgres does. To make sure your application doesn't execute long transactions which could span longer than `shutdownTimeout`, set the following setting in your Postgres database:

```sql
SET transaction_timeout TO '30s';
```

This will make Postgres trigger a recoverable error to your application if their transactions are taking too much time. A corresponding `shutdownTimeout` with a grace period could look like:

```yaml title="values.yaml"
shutdownTimeout: 33000 # 33 seconds
```

Finally, to ensure the PgDog container is terminated if none of these timeouts fire correctly, set the `terminationGracePeriodSeconds` to the total sum of `preStopSleepSeconds` and `shutdownTimeout`, for example:

```yaml title="values.yaml"
terminationGracePeriodSeconds: 99
# 63 seconds (pre-stop) + 33 seconds (shutdown timeout) + 3 seconds grace
```

The final configuration could look as follows:

=== "Helm chart"

    ```yaml title="values.yaml"
    preStopSleepSeconds: 63
    shutdownTimeout: 33000
    terminationGracePeriodSeconds: 99
    ```

=== "Rails"

    ```yaml
    production:
        # [...]
        max_age: 60 # in seconds
        variables:
          transaction_timeout: '30s'
    ```
