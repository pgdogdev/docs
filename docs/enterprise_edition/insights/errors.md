---
icon: material/alert-circle
---

# Errors

PgDog tracks query errors returned by PostgreSQL, providing a real-time view into recently encountered issues like syntax errors, missing columns, or lock timeouts.

## Admin database

You can see recent errors by connecting to the [admin database](../../administration/index.md) and running the `SHOW ERRORS` command:

=== "Command"
    ```
    SHOW ERRORS;
    ```

=== "Output"
    ```
                 error              | count | age  |         query
    --------------------------------+-------+------+------------------------
     column "sdfsdf" does not exist |     1 | 1444 | SELECT sdfsdf;
     syntax error at end of input   |     3 |  500 | SELECT FROM users;
     relation "foo" does not exist  |     2 |  120 | SELECT * FROM foo;
    ```

The following information is available in the errors view:

| Column | Description |
|-|-|
| `error` | The error message returned by PostgreSQL. |
| `count` | The number of times this error has been encountered. |
| `age` | How long ago (in ms) was this error last seen. |
| `query` | The last SQL statement that caused the error. |

## Configuration

Errors are collected automatically if query statistics are enabled. The in-memory view is periodically purged of old errors, configurable in [`pgdog.toml`](../../configuration/pgdog.toml/general.md):

```toml
[query_stats]
enabled = true
max_errors = 100
max_error_age = 300_000 # 5 minutes
```

By default, PgDog will keep up to 100 distinct errors for a maximum of 5 minutes. This data is periodically sent to the [control plane](../control_plane/index.md), so the history of seen errors is available in the web UI.
