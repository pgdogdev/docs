# Sharding overview

Sharding PostgreSQL splits the database and all its tables and indices between multiple machines. Each machine runs its own PostgreSQL server, while PgDog takes care of routing queries and moving data between servers.

## Sharding basics

Before diving more in depth, let's take a look at the fundamentals. Each PostgreSQL server in a sharded cluster is called a **shard**. Each shard contains a subset of the total data, determined by a **sharding function**. A sharding function is some code that takes arbitrary data, typically a table column, and converts it to a **shard number**. A shard number is a unique identifier for each shard in the cluster, starting at 0 and ending with _N - 1_ where _N_ is total number of shards in the cluster.

<center style="margin-top: 2rem;">
    <img src="/images/sharding.png" width="70%" alt="Sharding" />
</center>

### Sharding function

A sharding function is typically based on some kind of hash. This hash ensures that data is distributed evenly between shards, no matter what that data is.

For example, SHA-256, a popular hashing function used for checking the integrity of files and TLS certificates, takes an arbitrary amount of data as input and produces a single 64-digit hexadecimal number. If we were to use that hash for sharding, we would take that number and divide it by the number of shards in the configuration. The remainder of that division would be the shard where that data should go.

```
shard_number = hash(data) % num_shards
```

PgDog uses a different [hashing function](sharding-functions.md), but the idea remains the same.

## Routing queries

To route queries, PgDog first needs to understand them. To make this work, it uses the [`pg_query`](https://docs.rs/pg_query/latest/pg_query/) crate, which bundles the PostgreSQL parser and comes with Rust bindings to its internals. This allows PgDog to parse any valid SQL query that PostgreSQL can execute.

PostgreSQL uses two kinds of protocols to send queries from clients to servers: the [simple protocol](internals/query-protocol.md#simple-protocol) and the [extended protocol](internals/query-protocol.md#extended-protocol). PgDog understands both of them, can extract query parameters and, using its sharding function, determine where queries should go.

### Cross-shard queries

When a query contains not enough parameters to determine the shard number, PgDog falls back to sending this query to all shards and collecting the results transparently to the client. This ensures that applications that don't know about sharding can continue to work normally.

While application developers should make every effort to avoid include sharding hints in their queries, this ensures that applications continue to work when that's not possible or not desired, like aggregate queries used for reporting and analytics.

## Learn more

- [Multi-shard queries](cross-shard.md)
- [Manual routing](manual-routing.md)
