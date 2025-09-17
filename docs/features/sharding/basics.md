---
icon: material/database
---
# Sharding basics

Sharding a PostgreSQL database splits it, with all its tables and indices, between multiple machines. Each machine will run its own PostgreSQL server and is, on its own, an independent database.

## Terminology

Some terms and expressions used in the documentation may be new to some readers. They are defined below.

| Term | Definition |
|------|------------|
| Shard | PostgreSQL database(s) that contains a portion of the entire dataset. |
| Sharding function | A function that takes some data and computes a shard number for where this data should be placed. |
| Shard number | A number between 0 and _N_ where _N_ is the total number of shards in the cluster. |
| Primary | A database that serves write queries like `INSERT`, `UPDATE`, `DELETE`, etc. |
| Replica | A database that has the same data as a primary and can only serve `SELECT` queries. |


### Shards

Each shard is responsible for a subset of the total data in the database cluster. Each shard can have multiple replica databases and only one primary. The primary is responsible for serving writes, like creating and updating rows, while replica databases are responsible for serving read queries.

When we refer to "shards" in this documentation, we mean primary and replica databases collectively responsible for a subset of the database data.

### Sharding function

A [sharding function](sharding-functions.md) is responsible for splitting data between shards. It's typically based on some kind of hash, divided by the total number of shards in the cluster, to obtain the shard number. The hash ensures that data is distributed uniformly between shards, no matter what that data is.

```
shard_number = hash(data) % num_shards
```

Alternatively, a sharding function can map the sharding keys directly to a shard number. This is done when the number of keys is relatively small and they represent large collections of evenly distributed data. Examples include country codes for geographic data or tenant IDs for multitenant applications.

## Read more

- [Sharding functions](sharding-functions.md)
- [Direct-to-shard queries](query-routing.md)
