---
icon: material/chart-timeline
---
# Query plans

For any [running query](active_queries.md) exceeding a configurable time threshold, PgDog EE will ask Postgres for a query plan. The query plans are stored in their own view, accessible via two methods:

1. [`SHOW QUERY_PLANS`](#admin-database) admin command
2. [Activity](active_queries.md#dashboard) view in the dashboard

## How it works

When a [running query](active_queries.md) exceeds a configurable threshold, PgDog EE will ask Postgres for its query plan by sending an `EXPLAIN` command via a dedicated connection. For prepared statements, PgDog automatically provides the parameters sent with the statement by the client.

Since `EXPLAIN` itself is very quick, fetching and storing query plans is efficient and doesn't impact database performance. Nonetheless, to avoid planning queries unnecessarily, the plans are stored in an in-memory cache. Old plans are evicted automatically and recomputed.

### Admin database

The query plans are accessible by connecting to the admin database and running the `SHOW QUERY_PLANS` command:

=== "Command"
    ```
    SHOW QUERY_PLANS
    ```
=== "Output"
    ```
                             query                         |                                                          plan                                                           | database | user  |   age
    -------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------+----------+-------+---------
     select pg_sleep(50);                                  | Result  (cost=0.00..0.01 rows=1 width=4)                                                                                | pgdog    | pgdog | 6984139
     SELECT abalance FROM pgbench_accounts WHERE aid = $1; | Index Scan using pgbench_accounts_pkey on pgbench_accounts  (cost=0.29..8.31 rows=1 width=4)  Index Cond: (aid = 96934) | pgdog    | pgdog |    7711
    (2 rows)
    ```

The following information is available in this view:

| Column | Description |
|-|-|
| `query` | The query for which the plan is prepared. |
| `plan` | The query plan fetched directly from PostgreSQL. |
| `database` | The name of the connection pool database. |
| `user` | The name of the user running the query. |
| `age` | How long ago the plan was fetched from Postgres (in ms). |

### Dashboard

The query plans are automatically attached to running queries and sent to the Dashboard via a dedicated connection. They can be viewed in real-time in the [Activity](active_queries.md#dashboard) tab.
