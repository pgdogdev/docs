---
icon: material/bug
---

# Client drivers compatibility

PgDog is generally compatible with all PostgreSQL client drivers. Some of them are used heavily in production by our customers and users, and we know them to work well. Others, less so, but they are generally expected to be compatible. A lot of them are tested in our [CI](https://github.com/pgdogdev/pgdog/tree/main/integration).

Some drivers have known compatibility or performance issues, [documented below](#known-issues).

## Client drivers

| Driver | Status | Limitations |
|-|-|-|
| `psycopg` (Python) | :material-check-circle-outline: | None. |
| `psycopg2` (Python) | :material-check-circle-outline: | Fully compatible but has some [performance constraints](#psycopg2). |
| `asyncpg` (Python) | :material-check-circle-outline: | None. |
| `ruby-pg` (Ruby) | :material-check-circle-outline: | None. |
| `node-postgres` (Node) | :material-check-circle-outline: | None. |
| Postgres.js (Node) | :material-check-circle-outline: | Needs [additional configuration](#postgresjs) for prepared statements to work correctly. |
| Prisma (Node) | :material-check-circle-outline: | Generates a lot of unique prepared statements, consider limiting the [prepared statements cache](#prisma). |
| Sequelize (Node) | :material-check-circle-outline:  | Uses `node-postgres` under the hood, no limitations. |
| PDO (PHP) |  :material-check-circle-outline: | None. |
| SQLx (Rust) |  :material-check-circle-outline: | None. |
| `tokio_postgres` (Rust) |  :material-check-circle-outline: | None. |
| `pgx` (Go) |  :material-check-circle-outline: | None. |
| `lib/pq` (Go) |  :material-check-circle-outline: | Needs [additional configuration](#libpq) for prepared statements to work correctly. |
| `sqlx` (Go) | :material-check-circle-outline:  | Uses `pgx` under the hood, no limitations. |
| `libpq` (C/C++) | :material-check-circle-outline: | None. |
| JDBC (Java) | :material-check-circle-outline: | [Manual routing](features/load-balancer/manual-routing.md) requires a bit of [tweaking](#jdbc). |

## Known issues

Some PostgreSQL client drivers have some performance or compatibility issues with PgDog. Most of them are only relevant if you're using [load balancing](features/load-balancer/index.md) or [sharding](features/sharding/index.md).

### JDBC

The Java PostgreSQL driver (JDBC) is using prepared statements to execute _all_ commands, including `BEGIN`, `SET`, and simple queries that don't include parameters (e.g., `$1`, `$2`, etc.)

This is usually fine; however, if you're using [manual routing](features/load-balancer/manual-routing.md), the comment can be cached client-side and cause incorrect query routing. To avoid this, enable the `extendedForPrepared` setting:

```java
String url = "jdbc:postgresql://localhost:6432/pgdog?preferQueryMode=extendedForPrepared";
Connection conn = DriverManager.getConnection(url, "user", "password");
```

### psycopg2

`psycopg2` doesn't support prepared statements. It will use the simple protocol and inject parameters directly into the query string client-side.

This doesn't cause any query routing issues; however, PgDog can't effectively cache the query syntax tree and has to parse queries _every time_ they are executed. This is computationally expensive. Consider switching to `psycopg` (version 3) or enabling our Rust-native query parser:

```toml
[general]
query_parser_engine = "pg_query_raw"
```

We benchmarked this to be 5 times faster than normal `pg_query` parsing, which should help.

### Postgres.js

`postgres` Node driver uses a combination of named and unnamed prepared statements. For [load balancing](features/load-balancer/index.md) or [sharding](features/sharding/index.md) to work correctly, PgDog needs to cache all prepared statements, including unnamed ones (we call them "anonymous"). This is not the default behavior and requires the following setting:

```toml
[general]
prepared_statements = "extended_anonymous"
```

### Prisma

Prisma doesn't correctly use the `IN` clause with arrays, causing it to generate a very large number of unique prepared statements. This is not a big problem, but if left unchecked, can cause heavy memory usage in PgDog. Consider setting a lower prepared statements [cache limit](features/prepared-statements.md#cache-limit):

```toml
[general]
prepared_statements_limit = 1_000
```

### lib/pq

`lib/pq` (Go) uses unnamed prepared statements which PgDog has to cache for [load balancing](features/load-balancer/index.md) or [sharding](features/sharding/index.md) to work correctly. This is not the default behavior and requires the following setting:

```toml
[general]
prepared_statements = "extended_anonymous"
```
