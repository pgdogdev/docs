# Cross-shard queries

If a client can't or chooses not to provide a sharding key, PgDog can route the query to all shards and combine the results automatically. To the client, this looks like the query executed against a single database.

<center style="margin-top: 2rem;">
    <img src="/images/cross-shard.png" width="65%" alt="Cross-shard queries" />
</center>

## How it works

Since PgDog speaks the Postgres protocol, it can connect to multiple database servers and collect `DataRow`[^1] messages as they are being sent by each server. Once all servers finish
executing the query, PgDog processes the result and sends it to the client as if all messages came from one server.

While this works for simple queries, others that involve sorting or aggregation are more complex and require special handling.

## Sorting

If the client requests results to be ordered by one or more columns, PgDog can interpret this request and perform the sorting once it receives all data messages from all servers. For queries that span multiple shards, this feature allows to retrieve results in the correct order. For example:

```postgresql
SELECT * FROM users WHERE admin IS true
ORDER BY id DESC;
```

This query doesn't specify a sharding key, so PgDog will send it to all shards in parallel. Once all shards receive the query, they will filter data from their respective `users` table and send the results ordered by the `id` column.

PgDog will receive rows from all shards at the same time. However, Postgres is not aware of other shards in the system so the overall sorting order will be wrong. PgDog will collect all rows and sort them by the `id` column before sending the results over to the client.

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

The rows are received asynchronously  as the query is executing on the shards. Once the messages are buffered, PgDog will sort them using the extracted column values and return the sorted result to the client.

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

!!! note
    PgDog doesn't use two-phase commit so make sure your DDL
    statements are idempotent and can be retried in case of an error.

### Two-phase commit

Currently, PgDog doesn't use two-phase commit to synchronize changes across all shards. Support for this feature is currently being built, and will require database operators to enable [prepared transactions](https://www.postgresql.org/docs/current/sql-prepare-transaction.html).

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

Processing results in PgDog requires it to parse Postgres data types from the wire protocol. Postgres supports many data types and PgDog, currently, can only handle a some of them. Clients can request results to be encoded in either `text` or `binary` encoding and supporting both requires special handling as well.

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
