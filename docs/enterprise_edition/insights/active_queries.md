---
icon: material/play-circle
---

# Active queries

PgDog Enterprise provides a real-time view into queries currently executing on its PostgreSQL connections. This is accessible in two places:

1. [`SHOW ACTIVE_QUERIES`](#admin-database) admin command
2. [Activity](#web-ui) view in the dashboard

## How it works

When a client sends a query to PgDog, it will first attempt to acquire a connection from the connection pool. Once acquired, it will register the query with the live query view. After the query finishes running, it's removed from the view.

Only queries that are currently executing through PgDog are visible. If your application doesn't connect to PgDog, its queries won't appear here.

### Admin database

You can see which queries are actually running on each instance by connecting to the [admin database](../../administration/index.md) and running the `SHOW ACTIVE_QUERIES` command:

=== "Command"
    ```
    SHOW ACTIVE_QUERIES;
    ```

=== "Output"
    ```
                         query                         | protocol | database | user  | running_time |                              plan
    ---------------------------------------------------+----------+----------+-------+--------------+---------------------------------------------------------------
     SELECT * FROM users WHERE id = $1                 | extended | pgdog    | pgdog |           15 | Index Scan on users  (cost=0.15..8.17 rows=1 width=64)
     SELECT pg_sleep(50)                               | simple   | pgdog    | pgdog |         1662 | Result  (cost=0.00..0.01 rows=1 width=4)
     INSERT INTO users (id, email) VALUES ($1, $2)     | extended | pgdog    | pgdog |            1 | Insert on users  (cost=0.00..0.01 rows=0 width=0)
    ```

The following information is available in the running queries view:

| Column | Description |
|-|-|
| `query` | The SQL statement currently executing on a PostgreSQL connection. |
| `protocol` | What version of the query protocol is used. `simple` protocol injects parameters into text, while `extended` is used by prepared statements. |
| `database` | The name of the connection pool database. |
| `user` | The name of the user executing the query. |
| `running_time` | For how long (in ms) has the query been running. |
| `plan` | The query execution plan obtained from PostgreSQL using `EXPLAIN`. |

### Web UI

If you're running multiple instances of PgDog, active queries from all instances are aggregated and sent to the [control plane](../control_plane/index.md). They are then made available in the Activity tab, in real-time, with query plans automatically attached for slow queries.

<center>
  <img src="/images/ee/activity.png" width="100%" alt="How PgDog works" class="screenshot" />
</center>

### Parameters

If your application is using prepared statements (or just placeholders in queries), the parameters for these queries are not shown and will not be sent to the control plane. 

If your application is using simple statements (parameters in query text), PgDog will normalize the queries, removing values and replacing them with parameter symbols (e.g., `$1`). This is to make sure no sensitive data leaves the database network.
