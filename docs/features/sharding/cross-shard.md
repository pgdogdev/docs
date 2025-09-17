---
icon: material/multicast
---
# Cross-shard queries

If a client can't or doesn't specify a sharding key in the query, PgDog will send that query to all shards in parallel, and combine the results automatically. To the client, this looks like the query was executed by a single database.

<center style="margin-top: 2rem;">
    <img src="/images/cross-shard.png" width="95%" alt="Cross-shard queries" />
</center>

## How it works

PgDog understands the Postgres protocol. It can connect to multiple database servers, send the query to all of them, and collect `DataRow`[^1] messages as they returned by each connection.

Once all servers finish executing the request, PgDog processes the result, performs any requested sorting, aggregation or row dismambiguation, and sends the complete result back to the client, as if all rows came from one database server.

## SELECT

Cross-shard read queries are executed by all shards concurrently, which makes PgDog an efficient scatter/gather engine, with data nodes powered by PostgreSQL.

The SQL language allows for powerful data filtration and manipulation. While we aim to support most operations, currently, support for most cross-shard operations is limited, as documented below.

| Operation | Supported | Limitations |
|-|-|-|
| Simple `SELECT` | :material-check: | None. |
| `ORDER BY` | :material-check: | Target columns must be part of the tuples returned by the query. |
| `GROUP BY` | :material-check: | 〃 |
| `DISTINCT` / `DISTINCT BY`| :material-check: | 〃 |
| CTEs | :material-wrench: | CTE must refer to data located on the same shard. |
| Window functions | :material-close: | Not currently supported. |
| Subqueries | :material-wrench: | Subqueries must refer to data located on the same shard. They cannot be used to return the value of a sharding key. |

### Sorting with `ORDER BY`

If the query contains an `ORDER BY` clause, PgDog can sort the rows once it receives all data messages from all servers. For cross-shard queries, this allows to retrieve rows in the specified order.

Two forms of syntax for the `ORDER BY` clause are supported:

| Syntax | Notes |
|-|-|
| `ORDER BY column_name` | The column must be present in the result set and named accordingly. |
| `ORDER BY <column position>` | The column is referred to by its position in the result, for example: `ORDER BY 1 DESC`. |

Sorting by multiple columns is supported, including opposing sorting directions, e.g.: `ORDER BY 1 ASC, created_at DESC`.

#### Example

```postgresql
SELECT * FROM users ORDER BY id DESC;
```

Since the `id` column is part of the result, PgDog can buffer and sort rows after it receives them from all shards. While referring to columns by name works well, it's sometimes easier to use column positions, for example:

```postgresql
SELECT * FROM users ORDER BY 1 DESC;
```

### Aggregates with `GROUP BY`

Aggregates are transformative functions: instead of returning rows as-is, they return calculated summaries, like a sum or a count. Many aggregates are commulative: the aggregate can be calculated from partial results returned by each shard.

Support for all aggregate functions is a work-in-progress, as documented below:

| Aggregate function | Supported | Notes |
|-|-|-|
| `COUNT` / `COUNT(*)` | :material-check: | Supported for most [data types](#supported-data-types). |
| `MAX` / `MIN` | :material-check: | 〃 |
| `SUM` | :material-check: | 〃 |
| `AVG` | :material-close: | Requires the query to be rewritten to return `AVG` and `COUNT`. |
| `percentile_disc` / `percentile_cont` | :material-close: | Very expensive to calculate on large results. |
| `*_agg` | :material-close: | Not currently supported. |
| `json_*` | :material-close: | 〃 |
| Statistics, like `stddev`, `variance`, etc. | :material-close: | 〃 |

#### Example

Aggregate functions can be combined with cross-shard sorting, for example:

```postgresql
SELECT COUNT(*), is_admin
FROM users
GROUP BY 2,
ORDER BY 1 DESC
```

#### `HAVING` clause

The `HAVING` clause is applied to the aggregate results by each shard, and whatever results are returned will match the clause. No additional processing by PgDog is necessary.


### Under the hood

The SQL syntax provides many ways to specify ordering. Currently, PgDog supports 2 formats:

* Order by column name(s)
* Order by column position

!!! note
    Ordering using a function, e.g. `ORDER BY random()` is not currently supported.

#### Order by column name

PgDog can extract the column names from the `ORDER BY` clause and match them
to values in `DataRow`[^1] messages based on their position in the `RowDescription`[^1] message.

For example, if the query specifies `ORDER BY id ASC, email DESC`, both `id` and `email` columns will be present in the `RowDescription` message along with their data types and locations in `DataRow`[^1] messages.

The rows are received asynchronously as the query is executing on the shards. Once the messages are buffered, PgDog will sort them using the extracted column values and return the sorted result to the client.

#### Example

```postgresql
SELECT * FROM users ORDER BY id, created_at
```

#### Order by column index

If the client specifies only column positions used for sorting, e.g., `ORDER BY 1 ASC, 4 DESC`, the mechanism for extracting data from rows is the same, except this time we don't need to look up columns by name: we have their position in the `RowDescription`[^1] message.

The rest of the process is identical to ordering by [column name](#order-by-column-name) and results are returned in the correct order to the client.

#### Example

```postgresql
SELECT * FROM "users" ORDER BY 1, 3
```

[^1]: [PostgreSQL message formats](https://www.postgresql.org/docs/12/protocol-message-formats.html)

## DDL

DDL statements, i.e., queries that modify the database schema, like `CREATE TABLE`, are sent to all shards simultaneously. This allows clients to modify all shard schemas at the same time and requires no special changes to systems used for schema management and migrations.

This assumes that all shards in the cluster have an identical schema. This is typically desired to make management of sharded databases simpler, but in scenarios where this is not possible, DDL queries can always be routed to specific shards using [manual routing](manual-routing.md).

If [two-phase commit](2pc.md) is enabled, DDL statements have a high chance to be atomic. Alternatively, they can generally be written to be idempotent and safe to retry in case of error.

### Two-phase commit

PgDog supports Postgres' [prepared transactions](https://www.postgresql.org/docs/current/sql-prepare-transaction.html) and [two-phase commit](2pc.md). If enabled, cross-shard writes have a high chance to be atomic and eventually consistent.


## Aggregates

PgDog has limited support for aggregate functions. Currently, the following functions are supported:

* `min()`
* `max()`
* `count()` / `count(*)`
* `sum()`

Aggregates have to be executed over [supported](#supported-data-types) data types.

### Limitations

Not all aggregates can be calculated in a cross-shard query. For example, `avg()` requires both the sum and the count of all values, which a query result won't have. In this case, the query needs to be rewritten to include both values.

Additionally, if using `GROUP BY`, the grouping column must be included in the result set. For example, the following aggregate currently won't work:

```postgresql
SELECT COUNT(*) FROM users
GROUP BY email;
```

PgDog works at the network layer and can only see the data sent and received by Postgres. To perform this aggregate,
we need to see the value for the `email` field. To make it work, the query should be rewritten to include the `email` column:


```postgresql
SELECT COUNT(*), email FROM users
GROUP BY email;
```

!!! note
    In the future, PgDog will be automatically rewriting queries to ensure
    aggregates can be calculated transparently to the client. See our [roadmap](../../roadmap.md) for
    more details.

## Supported data types

Processing results in PgDog requires it to parse Postgres data types from the wire protocol. Postgres supports many data types and PgDog, currently, can only handle some of them. Clients can request results to be encoded in either `text` or `binary` encoding and supporting both requires special handling as well.

| Data type | Sorting | Aggregation | Text format | Binary format |
|-|-|-|-|-|
| `BIGINT` | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline:  | :material-check-circle-outline:  |
| `INTEGER` | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline:  | :material-check-circle-outline:  |
| `SMALLINT` | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline:  | :material-check-circle-outline:  |
| `VARCHAR` | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline:  | :material-check-circle-outline:  |
| `TEXT` | :material-check-circle-outline: | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline:  |
| `NUMERIC` | :material-check-circle-outline: | :material-check-circle-outline: | :material-check-circle-outline:  | No |
| `REAL` | :material-check-circle-outline: | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline:  |
| `DOUBLE PRECISION` | :material-check-circle-outline: | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline:  |
| `INTERVAL` | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline:  | No  |
| `TIMESTAMP` | :material-check-circle-outline: | :material-check-circle-outline: | :material-check-circle-outline:  | No  |
| `TIMESTAMPTZ` | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline:  | No  |
| `UUID` | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline:  | :material-check-circle-outline: |
| `VECTOR` | Only by L2 | :material-check-circle-outline: | :material-check-circle-outline:  | :material-check-circle-outline:  |

!!! note
    `VECTOR` type doesn't have a fixed OID in Postgres because it comes from an extension (`pgvector`). We infer it from the `<->` operator used in the `ORDER BY` clause.

## Disable cross-shard queries

Cross-shard queries can be disabled with a configuration setting:

```toml
[general]
cross_shard_disabled = true
```

If enabled and a query doesn't have a sharding key, PgDog will return an error instead. This is useful in [multitenant](../../features/multi-tenancy.md) deployments where you want to explicitly block access to data between customers.
