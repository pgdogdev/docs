# Query routing

PgDog's query router is using the PostgreSQL parser to understand queries. Queries that contain a sharding key are routed automatically to the right shard. Queries that don't are sent to all shards and results are assembled by PgDog. The sharding scheme is transparent to clients: they don't know they are talking to a sharded database.

## How it works

PgDog is using the [pg_query](https://docs.rs/pg_query) crate, which bundles the PostgreSQL parser directly into Rust. This allows PgDog to understand all valid SQL syntax and commands.

### `SELECT`

`SELECT` queries are parsed to detect a sharding key in the `WHERE` clause. For example, if your database is sharded by the `"users"."id"` column, all queries that refer to that column, either directly or through a foreign key, can be routed to the right shard:

```postgresql
SELECT * FROM "payments"
INNER JOIN "orders" ON "orders"."id" = "payments"."order_id"
WHERE "payments"."user_id" = 1; -- Sharding key.
```

Both simple queries and [prepared statements](internals/query-protocol.md) are supported. So if your database client is using placeholders instead of actual values, PgDog will be able to extract those values from the PostgreSQL protocol and route requests to the right shard.

### `INSERT`

Insert queries are routed based on the values in the `VALUES` clause. For example, if your query is inserting rows into a sharded table, PgDog will inspect the values, extract the sharding key, and route the query to the matching shard:

```postgresql
INSERT INTO "payments" ("user_id", "amount") VALUES ($1, $2)
RETURNING *
```

Since `"user_id"` is a sharding key, value in placeholder `$1` will be used to route the query.


## `UPDATE`/`DELETE`

Both `UPDATE` and `DELETE` queries work similarly to `SELECT`s. The query parser looks for the `WHERE` clause, extracts the sharding key, and routes the query to the right shard. If no `WHERE` clause is present, or it's targeting a column not used for sharding, the query is sent to all shards simultaneously:

```postgresql
UPDATE "users"
SET "admin" = true
WHERE "email" LIKE '%@pgdog.dev';
```

## No foreign keys

It is often the case that some tables don't have a foreign key to the table used for sharding. For example, `"orders"` table may have a reference to `"payments"`, but having a reference to `"users"` is not strictly necessary. There are two ways to handle this scenario:

1. Add a `"user_id"` column with a foreign key reference
2. Use [manual routing](manual-routing.md) to add sharding context to a query

Adding a foreign key reference is often preferable since it simplifies both querying that table and sharding that table in the future. Maintaining that foreign key should be pretty simple, either with a database trigger or by using an [ORM](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping) at the application layer.

## Buffering transactions

Most transactions start with an explicit `BEGIN` statement. This statement has no sharding hints, so PgDog doesn't use it for routing. Before deciding on the shard, PgDog buffers this command and waits for the client to send an actual query. This allows it to route the entire transaction to the right shard before falling back to [cross-shard](cross-shard.md) routing.
