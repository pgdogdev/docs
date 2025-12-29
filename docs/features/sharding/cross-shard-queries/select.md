---
icon: material/table-search
---

# Cross-shard SELECT

A cross-shard `SELECT` query doesn't have one or has several sharding keys, which requires it to be executed by all shards. PgDog can perform it in parallel, assembling the results from each shard automatically. This makes it a powerful scatter/gather engine, with data nodes powered by PostgreSQL.

## How it works

When PgDog receives a `SELECT` query with no (or multiple) sharding keys, it connects to all databases and sends the query to all of them in parallel.

If the result needs post-processing, e.g., to support [sorting](#sorting) or [aggregation](#aggregates), it will buffer the rows in memory and perform the necessary operations. Otherwise, PgDog will stream the rows directly to the client.

!!! note "Predicate push-down"
    PgDog pushes all filtering, sorting and aggregation statements to the database. If the query is correctly constructed, the shards will return very few rows, allowing to search vast quantities of data without causing out-of-memory errors or latency issues in the proxy.

## Supported features

The SQL language allows for powerful data filtration and manipulation. While we aim to support most operations, currently, support for some cross-shard operations is limited as documented below:

| Operation | Supported | Limitations |
|-|-|-|
| `SELECT` columns | :material-check: | None. |
| `ORDER BY` | :material-check: | Columns must be part of the returned tuples. See [sorting](#sorting). |
| `DISTINCT` / `DISTINCT BY`| :material-check: | Columns must be part of the returned tuples. |
| `GROUP BY` | :material-wrench: | Columns must be part of the returned tuples. See [aggregates](#aggregates). |
| CTEs | :material-wrench: | CTE must refer to data located on the same shard. See [CTEs](#ctes) |
| Window functions | :material-close: | Not currently supported. |
| Subqueries | :material-wrench: | Subqueries must refer to data located on the same shard. See [subqueries](#subqueries). |

## Sorting

If the query contains an `ORDER BY` clause, PgDog can sort the rows returned from all shards automatically. This works by buffering data returned from all servers and sorting it in memory.

Currently, two forms of the `ORDER BY` SQL syntax are supported:

| Syntax |  Example | Notes |
|-|-|-|
| Order by column name |  `ORDER BY id, email` | The column must be present in the returned tuples. |
| Order by column position  | `ORDER BY 1, 2` |  The column is refernced by its position in the returned tuples. |

Sorting by multiple columns is supported, including opposing sorting directions, for example:

```postgresql
SELECT id, email, created_at FROM users
ORDER BY
    1 ASC,
    created_at DESC
```

Note that columns in the `ORDER BY` clause are retrieved from the table. PgDog cannot sort by columns it doesn't receive from the databases.

### Functions

PgDog currently doesn't support sorting results using a function, for example:

```postgresql
SELECT email FROM users ORDER BY coalesce(email, '')
```

To make this work, we need to implement all SQL functions inside PgDog. This is on the roadmap, but not currently a priority since the query can be easily rewritten to execute the function inside the database:

```postgresql
SELECT
    coalesce(email, '') -- executed by Postgres
FROM users
ORDER BY 1 -- sorted by both Postgres and PgDog
```

As a general rule, it's better to perform all data manipulations inside the target clause (`SELECT [...]`) and use the numbering notation in the `ORDER BY` clause to refer to the desired sorting order, e.g.:

```postgresql
SELECT
    id,
    email,
    first_name || last_name,
    substring(first_name FROM 1 FOR 5) AS short
FROM users ORDER BY
    3 ASC, -- first_name || last_name
    1 DESC -- id
```

### ORMs

ORMs like SQLAlchemy or ActiveRecord, more often than not, will write queries that work with PgDog out of the box. This is because they tend to fetch entire rows and use fully-qualified names in all parts of the statement, including the `ORDER BY` clause.

For example, this is how a [`first`](https://apidock.com/rails/ActiveRecord/FinderMethods/first) Rails/ActiveRecord query looks like:

```postgresql
SELECT * FROM users ORDER BY users.id LIMIT 1
```

The `users.id` column is present in the returned row, so PgDog can read it and sort the rows in the desired order.

## Aggregates

Aggregates are transformative functions: instead of returning rows as-is, they return calculated summaries, like a sum or a count. Many aggregate functions are cumulative: the final value can be calculated from partial results returned by each shard.

If an aggregate function is supported (see list of supported functions below), this is handled by PgDog automatically:

| Aggregate functions | Supported | Notes |
|-|-|-|
| `count`, `count(*)` | :material-check: | Works for most [data types](#supported-data-types). |
| `max`, `min`, `avg`, `sum` | :material-check: | Works for most [data types](#supported-data-types). |
| `stddev`, `variance` | :material-check: | Works for most [data types](#supported-data-types).|
| `percentile_disc`, `percentile_cont` | :material-close: | Doesn't work currently and very expensive to calculate on large datasets. |
| `*_agg` | :material-close: | Not currently supported. |
| `json_*` | :material-close: | Not currently supported.  |

Aggregate functions have to appear in the target clause of the statement (`SELECT [...]`), and can also be combined with sorting, for example:

```postgresql
SELECT COUNT(*), is_admin
FROM users
GROUP BY 2
ORDER BY 1 DESC
```

#### `HAVING` clause

The `HAVING` clause requires additional filtering of the results and is not currently supported. See [#695](https://github.com/pgdogdev/pgdog/issues/695) for more details.


### Rewriting queries

For some aggregate functions to work as expected, each shard may need to return columns and intermediate calculations not present in the original query.

For example, to get an average of a column, we need to fetch the row `count`, multiply it by the `avg` the column on each shard, and divide it by the total `count` of rows on all shards.

If the `count` function isn't present in the query, PgDog will automatically rewrite the query to add it. This allows queries, like the following example, to just work without modifications:

=== "Original"
    ```postgresql
    SELECT avg(price) FROM orders;
    ```
=== "Rewritten"
    ```postgresql
    SELECT avg(price), count(price) FROM orders;
    ```

PgDog automatically removes the `count` column from the returned rows, so applications don't have to handle this complexity.

The following aggregate functions take advantage of this feature:

- `avg`
- `stddev`
- `variance`

#### Configuration

This feature is **enabled** by default and requires no additional configuration.

## Supported data types

The following table lists the data types supported by PgDog for ordering and aggregation. Since Postgres clients can request results in either text or binary format, each one must be handled separately:

| Data type | Sorting | Aggregation | Text format | Binary format |
|-|-|-|-|-|
| `BIGINT`, `INTEGER`, `SMALLINT` | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline:  | :material-check-circle-outline:  |
| `VARCHAR`, `TEXT` | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline:  | :material-check-circle-outline:  |
| `NUMERIC` | :material-check-circle-outline: | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline: |
| `REAL`, `DOUBLE PRECISION` | :material-check-circle-outline: | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline:  |
| `INTERVAL` | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline:  | No  |
| `TIMESTAMP`, `TIMESTAMPTZ` | :material-check-circle-outline: | :material-check-circle-outline: | :material-check-circle-outline:  | No  |
| `UUID` | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline:  | :material-check-circle-outline: |
| `VECTOR` | Only by L2 | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline:  |

!!! note "pgvector data types"
    `VECTOR` type doesn't have a fixed OID in Postgres because it comes from an extension (`pgvector`). We infer it from the `<->` operator used in the `ORDER BY` clause.
