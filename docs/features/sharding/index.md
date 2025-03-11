# Sharding overview

Sharding PostgreSQL splits the database and all its tables and indices between multiple machines. Each machine runs its own PostgreSQL server, while PgDog takes care of routing queries and moving data between servers.

### Sharding basics

If you're not familiar with sharding fundamentals, take a look at the [sharding basics](basics.md). Even if you're a seasoned database expert, it's good to have a refresher to confirm your understanding matches with PgDog's implementation.

[**→ Sharding basics**](basics.md)

### Routing queries

PgDog is first and foremost a query router. It extracting sharding hints directly from SQL queries using a SQL parser. Read more about it in [query routing](query-routing.md).

[**→ Query routing**](query-routing.md)

### Cross-shard queries

When sharding hints are not present in a query, either accidently or on purpose, PgDog falls back to sending those queries to all shards. This is called a cross-shard query and results are assembled by PgDog, transparently to the client.

[**→ Cross-shard queries**](cross-shard.md)

### Manual routing

If direct-to-shard queries are desired but the query doesn't have enough information to extract this information automatically, clients can specify which to which shard PgDog should route the query.

[**→ Manual routing**](manual-routing.md)

### Sharding COPY

`COPY` commands transfer large amounts of data into PostgreSQL from a file. PgDog can shard this data automatically without clients having to do so manually.

[**→ Sharding COPY**](copy.md)

### Sharding existing databases

PgDog's most impressive feature is its ability to shard existing databases. The migration process uses logical replication and can be done without taking databases offline for maintenance.

[**→ Sharding existing databases**](existing.md)



## Learn more

- [Multi-shard queries](cross-shard.md)
- [Manual routing](manual-routing.md)
