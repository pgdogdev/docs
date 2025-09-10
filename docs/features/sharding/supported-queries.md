# Supported queries

[Automatic routing](query-routing.md) in PgDog works by parsing queries and extracting the sharding key. SQL is a complex language and we are aiming to support as many queries as possible. As the development moves forward, this page will be updated with latest features.

Postgres has 3 kinds of queries, each handled a little bit differently in a sharded context:

1. CRUD statements (`INSERT`, `UPDATE`, `SELECT`, `DELETE`, `COPY`) are parsed for sharding keys and routed to one or more shards
2. DDL statements (e.g., `CREATE TABLE`, `BEGIN`, `ROLLBACK`, etc.) are sent to all shards in parallel
3. `SET` statements are intercepted and client state is updated to keep track of session variables

## CRUD

### `SELECT`

`SELECT` queries are the core feature of PostgreSQL and support a wide range of access patterns. PgDog parses the `WHERE` clause looking for sharding keys and supports the following patterns:

1. A column is equal to a value
2. A column is matched against a list of values using `IN`

#### Examples

```postgresql
-- Sharding key equals a single value
SELECT * FROM users WHERE user_id = $1

-- Sharding keys IN tuple
SELECT * FROM users WHERE id IN ($1, $2, $3)
```

Queries that don't match this pattern will currently be routed to all shards. We are continuously adding support for more complex patterns.

#### `SELECT` queries that write

Some `SELECT` queries can perform writes, like inside a CTE, for example:

```postgresql
WITH t AS (
  INSERT INTO users (id, email) VALUES (1, 'test@test.com') RETURNING *
)
SELECT * FROM t;
```

PgDog handles this automatically by scanning CTEs and redirecting the entire statement to the primary database. Currently, the sharding key is not extracted from CTEs, so this query will be routed to all shards.

### `UPDATE` and `DELETE`

Both `UPDATE` and `DELETE` queries work the same way as `SELECT` queries. The `WHERE` clause is checked for a sharding key using one of the 2 supported patterns and if a key is found, the query is routed to the right shard. Statements without a key are sent to all shards, in parallel.

#### Examples

```postgresql
-- UPDATE query
UPDATE users SET admin = true WHERE id = $1;

-- DELETE query
DELETE FROM users WHERE id IN ($1, $2, $3);
```

### `INSERT`

`INSERT` queries need to specify the column names in order for PgDog to be able to extract the sharding key from the tuple:

```postgresql
INSERT INTO users (id, email) VALUES ($1, $2);
```

Currently, PgDog only supports `INSERT` statements with one tuple in the `VALUES` clause. In the future, statements with multiple tuples will be rewritten and sent separately to each matching shard.

### `COPY`

`COPY` statements are automatically sharded between all shards. See [COPY](copy.md) for more details.

## DDL

DDL statements (e.g., `CREATE TABLE`) are sent to all shards in parallel. If [two-phase commit](2pc.md) is enabled, DDL statements have a high chance to be atomic.
