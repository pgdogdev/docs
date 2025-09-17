---
icon: material/call-split
---
# Direct-to-shard queries

PgDog has a powerful parser that can extract sharding hints directly from SQL queries. Queries that refer to a column in one of the [sharded tables](../../configuration/pgdog.toml/sharded_tables.md) are sent directly to the corresponding database in the [configuration](../../configuration/pgdog.toml/databases.md).

Direct-to-shard queries are foundational to horizontal database scaling. The more queries can be routed to just one database, the more requests can be served by the entire cluster.

## How it works

PgDog is using the [pg_query](https://docs.rs/pg_query) library, which provides direct access to the native PostgreSQL parser. This allows PgDog to read and understand **100%** of valid SQL queries and commands.

<center>
  <img src="/images/intro.png" width="95%" alt="How PgDog works" />
</center>

PgDog is deployed as a proxy between Postgres shards and the application and takes care of routing queries between them. Each SQL command is different and is handled differently by our query router, as documented below.

## SELECT

To route `SELECT` queries, the query router looks for a sharding key in the `WHERE` clause. For example, if your database is sharded by the `user_id` column, all queries that filter rows by that column, either directly or through a foreign key, can be sent to a single shard:

```postgresql
SELECT * FROM payments
INNER JOIN orders
  ON orders.id = payments.order_id
WHERE
  payments.user_id = $1; -- Sharding key.
```

Both regular queries and [prepared statements](../prepared-statements.md) are supported. So if your database driver is using placeholders instead of actual values, PgDog will extract the sharding key value from the extended protocol messages.

### Supported syntax

The `SELECT` query can express complex filtering logic and not all of it is currently supported. The following filters in the `WHERE` will work:

| Filter | Example |
|-|-|
| Column equals to a value | `payments.user_id = $1` |
| Column matches against a list | `payments.user_id IN ($1, $2, $3)`

All other variations will be ignored and the query will be sent to [all shards](cross-shard.md).

!!! note "Query router improvements"
    This is an area of constant improvement. Check back here for updates or [create an issue](https://github.com/pgdogdev/pgdog/issues/new) to request
    support for a particular filter you're using.

If the query has multiple sharding key filters, all of them will be extracted and converged to a set of unique shard numbers.

For example, when filtering by a list of values, e.g., `WHERE user_id IN ($1, $2, $3)`, if all of them map to a single shard, the query will be sent to that shard only. If they map to two or more shards, it will be sent to all corresponding shards [concurrently](cross-shard.md).


## `INSERT`

Insert queries are routed using the values in the `VALUES` clause, for example:

```postgresql
INSERT INTO payments (user_id, amount) VALUES ($1, $2) RETURNING *
```

If the query is inserting a row into a [sharded table](../../configuration/pgdog.toml/sharded_tables.md), the query router will extract the sharding key, and route the query to the corresponding shard.

Just like for `SELECT` queries, both [prepared statements](../prepared-statements.md) and regular queries are supported.

### Supported syntax

To correctly identify the sharding key in the `VALUES` clause, the `INSERT` statement must explicitly name the columns in the tuple. Additionally, statements must create one row at a time. Multi-tuple `INSERT`s are not currently supported.

For example:

```postgresql
INSERT INTO payments -- Missing column names.
VALUES ($1, $2), ($3, $4) -- More than one tuple.
```

## `UPDATE` and `DELETE`

Both `UPDATE` and `DELETE` queries work identically to [`SELECT`](#select) queries. The query router looks inside the `WHERE` clause for sharding keys, and routes the query to the corresponding shard.

If no `WHERE` clause is present, or it's filtering on a column not used for sharding, the query is sent to all shards [concurrently](cross-shard.md), for example:

```postgresql
UPDATE users SET banned = true;
```

<!--
## `SET`

The `SET` statement is used for setting session variables and doesn't read or write data. For example:

```postgresql
SET statement_timeout TO 0;
```

`SET` statements have no sharding key, but instead of executing a [cross-shard](cross-shard.md) query, PgDog will handle it internally without sending it to a database.

and save the variable inside the client state. When that client executes a transaction, PgDog will first update the session variables on each backend connection before sending the query over to the server.-->

## Foreign keys

While it's best to choose a sharding column present in all tables, it is sometimes not desirable or possible to do so. For example, it's redundant to store a foreign key in a table that has a transitive relationship to another table:

<center>
  <img src="/images/fk.png" width="95%" alt="How PgDog works" />
</center>

In this example, the `order_items` table has a foreign key to `orders`, which in turn refers to `users`. This makes `order_items` related to `users` as well, but it doesn't need a foreign key to that table. However, this also means that table doesn't have a sharding key.

To make querying the `order_items` table in a sharded database possible, the following workarounds are available:

| Workaround | Description |
|-|-|
| Add sharding key column | Add the sharding key column to the table and backfill it with corresponding values. |
| [Manual routing](manual-routing.md) | Provide sharding hints to the query router via SQL comments or `SET` commands. |
| Use joins | For `SELECT` queries only, refer to the table as part of a join to a table that has the sharding key column. All other queries would need to use [manual routing](manual-routing.md).|

Adding the sharding key column is often best, because it makes writing queries a lot easier. The sharding key is usually a compact data type, like a `BIGINT` or a `UUID`, so it doesn't take up much space, and can be backfilled relatively quickly. If backfilling, make sure to do so in small batches, so as to reduce impact on database performance.

## Read more

- [Cross-shard queries](cross-shard.md)
- [Manual routing](manual-routing.md)
