---
icon: material/chart-bar
---

# Query statistics

PgDog collects detailed per-query statistics, similar to PostgreSQL's `pg_stat_statements`, with extra information useful for debugging application performance. These are viewable and searchable in the [control plane UI](../control_plane/index.md) and in the [admin database](#admin-database).

## How it works

All queries are normalized (parameters replaced with `$1`, `$2`, etc.) and grouped, so you can see aggregate performance data for each unique query pattern. Each query execution is recorded, along with the number of rows returned, the time it took to process the request, and how much of it was spent idling inside a transaction.

This data is accessible via two mediums:

1. [Admin database](#admin-database)
2. The Insights page in the web UI of the [control plane](../control_plane/index.md)

### Admin database

You can view query statistics by connecting to the [admin database](../../administration/index.md) and running the `SHOW QUERY_STATS` command:

=== "Command"
    ```
    SHOW QUERY_STATS;
    ```

=== "Output"
    ```
    -[ RECORD 1 ]------------+-------------------------------
    query                    | SELECT now();
    calls                    | 1
    active                   | 0
    total_exec_time          | 2.045
    min_exec_time            | 2.045
    max_exec_time            | 2.045
    avg_exec_time            | 2.045
    total_rows               | 1
    min_rows                 | 1
    max_rows                 | 1
    avg_rows                 | 1.000
    errors                   | 0
    last_exec                | 2026-03-06 13:06:23.255 -08:00
    last_exec_in_transaction | 0
    idle_in_transaction_time | 0.000
    -[ RECORD 2 ]------------+-------------------------------
    query                    | SELECT $1;
    calls                    | 2
    active                   | 0
    total_exec_time          | 5.718
    min_exec_time            | 2.322
    max_exec_time            | 3.397
    avg_exec_time            | 2.859
    total_rows               | 2
    min_rows                 | 1
    max_rows                 | 1
    avg_rows                 | 1.000
    errors                   | 0
    last_exec                | 2026-03-06 13:06:15.990 -08:00
    last_exec_in_transaction | 0
    idle_in_transaction_time | 0.000
    ```

The following information is available in the query statistics view:

| Column | Description |
|-|-|
| `query` | The normalized SQL statement. |
| `calls` | Total number of times this query has been executed. |
| `active` | Number of instances of this query currently executing. |
| `total_exec_time` | Total execution time (in ms) across all calls. |
| `min_exec_time` | Minimum execution time (in ms) of a single call. |
| `max_exec_time` | Maximum execution time (in ms) of a single call. |
| `avg_exec_time` | Average execution time (in ms) per call. |
| `total_rows` | Total number of rows returned across all calls. |
| `min_rows` | Minimum number of rows returned by a single call. |
| `max_rows` | Maximum number of rows returned by a single call. |
| `avg_rows` | Average number of rows returned per call. |
| `errors` | Total number of errors encountered by this query. |
| `last_exec` | Timestamp of the last time this query was executed. |
| `last_exec_in_transaction` | Number of times the last execution was inside a transaction. |
| `idle_in_transaction_time` | Total time (in ms) spent idle inside a transaction after this query completed. |

### Configuration

Query statistics collection can be enabled/disabled and tweaked via configuration in [`pgdog.toml`](../../configuration/pgdog.toml/general.md):

```toml
[query_stats]
enabled = true
max_entries = 10_000
```

By default, if enabled, query statistics will store 10,000 distinct query entries. When a new query exceeds this limit, PgDog will remove the least frequently seen query from the view, using a similar exponential decay algorithm used by `pg_stat_statements` in PostgreSQL.


### Comparison to `pg_stat_statements`

PgDog's query statistics are an improvement on `pg_stat_statements` because they record information it doesn't, like `errors`, and idle-in-transaction timing. These are important for debugging production performance issues.

Additionally, PgDog can have multiple instances of the proxy in front of the same database. This allows the query statistics implementation to have a lower impact on overall database performance, by taking advantage of multiple CPUs and reduced locking overhead.
