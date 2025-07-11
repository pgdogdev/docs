# Supported queries

[Automatic routing](query-routing.md) in PgDog works by parsing queries and extracting the sharding key. SQL is a complex language and we are aiming to support as many queries as possible. As the development moves forward, this page will be updated with the types of queries we support for automatic query routing.

## Queries

Postgres has 3 kinds of statements, all of which are supported by PgDog:

1. CRUD statements that change, read, update or delete data from tables: `INSERT`, `UPDATE`, `SELECT`, `DELETE`.
5. DDL statements that change the schema or control transaction state, e.g., `CREATE TABLE`, `BEGIN`, `ROLLBACK`, etc.
6. `SET` statements which update connection session state, e.g., `SET statement_timeout TO 0`.

How PgDog handles each kind of statements is documented below.

### `SELECT`

`SELECT` queries are the core feature of PostgreSQL and support a wide range of access patterns. Currently, PgDog is able to extract sharding keys from the following queries:

1. The sharding key is equal to a single value
2. The key is several values in an `IN` statement

#### Examples

```postgresql
-- Sharding key equals to a single value
SELECT * FROM users WHERE user_id = $1

-- Sharding keys IN tuple
SELECT * FROM users WHERE id IN ($1, $2, $3)
```

Queries that don't match this pattern will currently be routed to all shards.

### `UPDATE` and `DELETE`


## UPDATE queries
