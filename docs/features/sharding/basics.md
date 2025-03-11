# Sharding basics

Sharding databases is splitting a PostgreSQL database, with all its tables and indices, between multiple machines. Each machine will run its own PostgreSQL server and is a complete and independent database.

Each shard is responsible for a subset of the total data. Each shard can have multiple databases, but only one primary. The primary is responsible for serving writes, like storing or updating rows, while replica databases are responsible for serving read queries.

### Sharding function

A sharding function is responsible for splitting data between shards. It's typically based on some kind of hash, which is then divided by the total number of shards to obtain the shard number. This hash ensures that data is distributed evenly between shards, no matter what that data is.

For example, SHA-256, a popular hashing function used for checking the integrity of files and TLS certificates, takes an arbitrary amount of data as input and produces a single 64-digit hexadecimal number. If we were to use that hash for sharding, we would take that number and divide it by the number of shards in the configuration. The remainder of that division would be the shard where that data should go.

```
shard_number = hash(data) % num_shards
```


## Language

Some terms and expressions used in the documentation may be new to some readers. They are defined below.

| Term | Definition |
|------|------------|
| Shard | PostgreSQL database that contains a portion of the entire dataset. It is typically installed on a separate machine. |
| Sharding function | A function that takes some data and computes a shard number for where this data should be placed. |
| Shard number | A number between 0 and _N_ where _N_ is the total number of shards in the cluster. |
| Primary | A database that serves write queries like `INSERT`, `UPDATE`, `DELETE`, etc. |
| Replica | A database that has the same data as a primary and can only serve `SELECT` queries. |
