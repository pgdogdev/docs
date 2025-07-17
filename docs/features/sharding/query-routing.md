# Query routing

PgDog's query router is using the PostgreSQL parser to understand queries. Queries that contain a sharding key are routed automatically to the right shard. Queries that don't are sent to all shards and results are assembled by PgDog. The sharding scheme is opaque to clients: they don't know they are talking to a sharded database.

## How it works

PgDog is using the [pg_query](https://docs.rs/pg_query) crate, which bundles the PostgreSQL parser directly into Rust. This allows PgDog to understand all valid SQL syntax and commands.

### `SELECT`

`SELECT` queries are parsed to detect a sharding key in the `WHERE` clause. For example, if your database is sharded by the `user_id` column, all queries that refer to that column, either directly or through a foreign key, can be routed:

```postgresql
SELECT * FROM payments
INNER JOIN orders
  ON orders.id = payments.order_id
WHERE
  payments.user_id = $1; -- Sharding  key
```

Both simple queries and [prepared statements](../prepared-statements.md) are supported. So if your database client is using placeholders instead of actual values, PgDog will be able to extract those values from the PostgreSQL protocol and route the requests.

#### Supported syntax

The `SELECT` query can express complex filtering logic and not all of it is currently parsed to extract the sharding key. As of this writing, only the following filters in the `WHERE` clause are supported:

| Filter | Example |
|-|-|
| Column equals to a value | `payments.user_id = $1` |
| Column matched against a list | `payments.user_id IN ($1, $2, $3)`

All other variations will be ignored and the query will be routed to all shards.

!!! note
    This is an area of constant improvement. Check back here for updates or [create an issue](https://github.com/pgdogdev/pgdog/issues/new) to request
    support for a particular filter you're using.

Multiple sharding keys will be hashed and converged to a unique set of shards. For example, `WHERE user_id IN ($1, $2, $3)`, all 3 values will be hashed and if they all reside on one shard, the query will be routed to that shard only. If it matches 2 or more shards, the query will be sent to all matching shards concurrently.


### `INSERT`

Insert queries are routed based on the values in the `VALUES` clause. For example, if your query is inserting rows into a sharded table, PgDog will inspect the values, extract the sharding key, and route the query to the matching shard:

```postgresql
INSERT INTO payments (user_id, amount) VALUES ($1, $2)
RETURNING *
```

Since `user_id` is the sharding key, value in placeholder `$1` will be used to route the query. Just like with `SELECT`s, both placeholders and actual values are supported.

#### Supported syntax

To correctly identify the sharding key in an `INSERT` statement, it must explicitly name the columns in the tuple. Additionally, only one tuple can be inserted per query.

!!! note
    This is an area of constant improvement. We'll be adding support for multiple tuples per `INSERT` statement shortly. Currently, statements like this one will result in a cross-shard query:

    ```postgresql
    INSERT INTO payments VALUES ($1, $2), ($3, $4)
    ```


## `UPDATE`/`DELETE`

Both `UPDATE` and `DELETE` queries work similarly to `SELECT`s. The query parser looks for the `WHERE` clause, extracts the sharding key, and routes the query. If no `WHERE` clause is present, or it's targeting a column not used for sharding, the query is sent to all shards simultaneously:

```postgresql
UPDATE users
SET admin = true
WHERE email LIKE '%@pgdog.dev';
```

If the column(s) are indexed, even a cross-shard query will be fast, since it's executed in parallel across all nodes.

#### Supported syntax

The same limitations detailed in [`SELECT`](#supported-syntax) apply to `UPDATE`/`DELETE` statements.

## `SET`

The `SET` statement updates the value of a session variable, for example:

```postgresql
SET statement_timeout TO 0;
```

This type of statement has no sharding key, but instead of sending it to all shards for no good reason, PgDog will process it internally and save the variable inside the client state. When that client executes a transaction, PgDog will first update the session variables on each backend connection before sending the query over to the server.

## No foreign keys

It is often the case that some tables don't have a foreign key to the table used for sharding. For example, `orders` table may have a reference to `payments`, but having a reference to `users` is not strictly necessary. There are 3 ways to handle this scenario:

1. Add a `user_id`-like column with a foreign key reference and backfill it
2. Use [manual routing](manual-routing.md) to add sharding context to the query
3. Only refer to that table as part of a join to a table that has the sharding key

Adding a foreign key reference is often preferable since it simplifies both querying that table and sharding that table in the future. Maintaining that foreign key should be pretty simple, either with a database trigger or by using an [ORM](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping) at the application layer.

Backfilling the column will take some time if the table is large, but it can be done in small increments and won't impact database performance.

## Buffering transaction statements

Most transactions start with an explicit `BEGIN` statement. This statement has no sharding hints, so PgDog doesn't use it for routing. Before deciding on the shard, PgDog buffers this command and waits for the client to send an actual query. This allows it to route the entire transaction before falling back to a [cross-shard](cross-shard.md) query.

#### Timing

Buffering statements is opaque to the client. PgDog will return a response, telling the client the transaction has been started. This is safe, except in scenarios where the transaction start time is important to the application. In that case, calls to functions like `NOW()` will return the time when the database received the transaction and not when the client requested it.
