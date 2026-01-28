---
icon: material/check-bold
---
# Supported queries

[Automatic routing](query-routing.md) in PgDog works by parsing queries and extracting the sharding key. SQL is a complex language and we are aiming to support as many queries as possible. As the development moves forward, this page will be updated with the latest features.

Postgres has 3 kinds of queries, each handled a little bit differently in a sharded context:

1. DML statements (`INSERT`, `UPDATE`, `SELECT`, `DELETE`, `COPY`) are parsed for sharding keys and routed to one or more shards
2. DDL statements (e.g., `CREATE TABLE`, `BEGIN`, `ROLLBACK`, etc.) are sent to all shards in parallel
3. `SET` statements are intercepted and client state is updated to keep track of session variables

## DML

### `SELECT`

`SELECT` queries are the core feature of PostgreSQL and support a wide range of access patterns. PgDog parses the `WHERE` clause looking for sharding keys and supports the following patterns:

1. A column is equal to a value
2. A column is matched against a list of values using `IN`

#### Examples

```postgresql
-- Sharding key equals a single value.
SELECT * FROM users WHERE user_id = $1;

-- Sharding keys in a tuple.
SELECT * FROM users WHERE id IN ($1, $2, $3);
```

The sharding key can be present anywhere in the query, including a join, a subquery, or a CTE. For example:

```postgresql
-- Join.
SELECT * FROM users
INNER JOIN orders ON users.id = $1 AND orders.user_id = users.id;

-- Subquery.
SELECT * FROM users WHERE id IN (
    SELECT user_id FROM orders WHERE user_id = $1
);

-- CTE.
WITH my_user AS (
    SELECT * FROM users WHERE id = $1
) SELECT * FROM my_user;
```

Queries that don't specify a sharding key or specify more than one will be routed to all shards.

### `UPDATE` and `DELETE`

Both `UPDATE` and `DELETE` queries work the same way as `SELECT` queries. The `WHERE` clause and any CTEs are checked for a sharding key, using any of the supported patterns, and if a key is found, the query is routed directly to one shard. Statements without a key are sent to all shards, in parallel.

#### Examples

```postgresql
UPDATE users SET admin = true WHERE id = $1;

DELETE FROM users WHERE id IN ($1, $2, $3);
```

### `INSERT`

`INSERT` queries can take two forms: specifying column names explicitly or implicitly. PgDog is able to detect the sharding key in both cases (using its [schema cache](schema_management/cache.md)) and route the query correctly:

```postgresql
INSERT INTO users (id, email) VALUES ($1, $2);
INSERT INTO users VALUES ($1, $2);
```

Statements with multiple tuples can be [rewritten automatically](cross-shard-queries/insert.md#multiple-tuples) to write each row to its corresponding shard.

### `COPY`

`COPY` statements are [automatically sharded](cross-shard-queries/copy.md) between all shards.

## DDL

[DDL statements](cross-shard-queries/ddl.md) (e.g., `CREATE TABLE`) are sent to all shards in parallel. If [two-phase commit](2pc.md) is enabled, these statements have a high chance to be atomic.
