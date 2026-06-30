---
icon: material/table-search
---

# Cross-shard SELECT

A cross-shard SELECT query has either no sharding key or multiple sharding keys, which requires it to be executed by multiple database shards. PgDog can perform this in parallel, assembling the results from each shard automatically. This makes it a powerful scatter/gather engine, with data nodes powered by regular PostgreSQL.

## How it works

When PgDog receives a SELECT query with no sharding key, or with multiple sharding keys, it connects to all databases and sends the query to all of them in parallel.

If the result needs post-processing, e.g., to support [sorting](#sorting) or [aggregation](#aggregates), PgDog will buffer the rows in memory and perform the necessary operations. Otherwise, it will stream the rows directly to the application.

### Predicate push-down

PgDog pushes all filtering, sorting, and aggregation statements to the database. If the query is correctly constructed, the shards will return very few rows, allowing searches over vast quantities of data without causing out-of-memory errors or latency issues in the proxy.

## Supported features

SQL allows powerful data filtering and manipulation. While we aim to support most operations, support for some cross-shard operations is currently limited as documented below:

| Operation | Support | Limitations |
|-|-|-|
| `SELECT` columns | :material-check: | |
| `ORDER BY` | Partial support | Columns must be part of the returned tuples. See [sorting](#sorting). |
| `DISTINCT` / `DISTINCT BY` | Partial support | Columns must be part of the returned tuples. |
| `GROUP BY` | Partial support | Columns must be part of the returned tuples. See [aggregates](#aggregates). |
| `LIMIT` | :material-check: | |
| `OFFSET` | :material-check: | Rows are filtered in memory, so pagination becomes linearly more expensive with the number of pages. |
| CTEs | Partial support | CTE queries must refer to data located on the same shard, e.g., the same sharding keys or [omnisharded](../omnishards.md) tables. |
| Window functions | :material-close: | Not currently supported, but on the roadmap. |
| Subqueries | Partial support | Just like CTEs, subqueries must refer to data located on the same shard, e.g., the same sharding keys or [omnisharded](../omnishards.md) tables. |

## Sorting

If the query contains an `ORDER BY` clause, PgDog can sort the rows returned from all shards. This works by buffering the data returned from all servers and sorting it in memory.

Currently, two forms of the `ORDER BY` SQL syntax are supported:

| Syntax |  Example | Notes |
|-|-|-|
| Order by column name |  `ORDER BY id, email` | The column must be present in the returned tuples. |
| Order by column position | `ORDER BY 1, 2` | |

Sorting by multiple columns is supported, including opposing sort directions, for example:

```postgresql
SELECT id, email, created_at FROM users
ORDER BY
    1 ASC,
    created_at DESC
```

Note that columns in the `ORDER BY` clause are retrieved from the table. PgDog cannot sort by columns it doesn't receive from the database shards.

### Sorting by functions

!!! warning "Not currently supported"
    PgDog doesn't currently support sorting rows by the result of a SQL function.

PgDog currently doesn't support sorting results using a function, for example:

```postgresql
SELECT email FROM users ORDER BY coalesce(email, '')
```

To make this work, we need to implement many SQL functions inside PgDog. This is on the roadmap, but it is not currently a top priority since the query can be easily rewritten to execute the function inside the database:

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

ORMs like SQLAlchemy, ActiveRecord, Prisma, etc., will often generate queries that work with PgDog out of the box. This is because they tend to fetch entire rows and use fully qualified names in all parts of the statement, including the `ORDER BY` clause.

For example, this is what a [`first`](https://apidock.com/rails/ActiveRecord/FinderMethods/first) Rails/ActiveRecord query looks like:

```postgresql
SELECT * FROM users ORDER BY users.id LIMIT 1
```

The `users.id` column is present in the returned row, so PgDog can read it and sort the rows in the desired order.

## Aggregates

Aggregates are transformative functions: instead of returning rows as-is, they return calculated summaries, like a sum or a count. Many aggregate functions are cumulative: the final value can be calculated from the partial results returned by each shard.

If an aggregate function is supported (see list of supported functions below), this is handled by PgDog automatically:

| Aggregate functions | Support | Notes |
|-|-|-|
| `count()`, `count(*)` | :material-check: | Works for most [data types](#supported-data-types). |
| `max()`, `min()`, `avg()`, `sum()` | :material-check: | Works for most [data types](#supported-data-types). |
| `stddev()`, `variance()` | :material-check: | Works for most [data types](#supported-data-types). Results are [approximated](#rewriting-queries). |
| `percentile_disc`, `percentile_cont` | :material-close: | Not currently supported and very expensive to calculate on large datasets. |
| `*_agg` | :material-close: | Not currently supported, but on the roadmap. |
| `json_*` | :material-close: | Not currently supported, but on the roadmap. |

Aggregate functions must appear in the target clause of the statement (`SELECT [...]`) and can also be combined with sorting, for example:

```postgresql
SELECT COUNT(*), is_admin
FROM users
GROUP BY 2
ORDER BY 1 DESC
```

#### HAVING clause

!!! warning "Not currently supported"
    The `HAVING` clause is not currently supported but is on the roadmap.

The `HAVING` clause requires additional filtering of the results and is not currently supported. See [#695](https://github.com/pgdogdev/pgdog/issues/695) for more details.


## Rewriting queries

For some aggregate functions to work as expected, each shard may need to return columns and intermediate calculations that are not present in the original query.

For example, to get the average of a column, we need to fetch the row count from each shard, multiply it by the average of the column on each shard, and divide it by the total count of rows on all shards.

If the `count()` function is needed to compute an aggregate but isn't present in the query, PgDog will automatically rewrite the query to add it. This allows queries like the following example to work without modification:

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

| Function | Description |
|-|-|
| `avg()` | Calculates the average of a column across multiple shards. |
| `stddev()` | Uses an approximation of the actual standard deviation. |
| `variance()` | Same as `stddev()`, the result is approximated. |

This feature is **enabled** by default for all cross-shard SELECT queries and requires no additional configuration.

## Supported data types

The following table lists the data types supported by PgDog for ordering and aggregation. Since Postgres clients can request results in either text or binary format, each format must be handled separately:

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

!!! note "pgvector"
    The `VECTOR` type doesn't have a fixed OID in Postgres because it comes from an extension (`pgvector`). We infer it from the `<->` operator used in the `ORDER BY` clause.
