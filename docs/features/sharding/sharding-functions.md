# Sharding function

The sharding function transforms arbitrary data to a shard number. The shard number is then used for routing queries to that shard.

## How it works

PgDog sharding function is based off of the PostgreSQL declarative partitions hashing function. This choice is intentional, since it allows data to be sharded both inside PgDog and in PostgreSQL, using partitions:

```postgresql
CREATE TABLE data (
  id BIGINT
) PARTITION BY HASH(id);
```

When computing shard numbers for a row, PgDog hashes the sharding key and returns a shard number. To achieve the same inside the database, you can use the `satisfies_hash_partition` function:

```postgresql
SELECT satisfies_hash_partition(
  'data'::regclass, -- Partitioned table.
  3, -- Number of shards.
  0, -- A shard number.
  1 -- Sharding key.
);
```

This function will return true if the sharding key should be placed in the specified shard, given the total number of shards in the cluster.

While the interface of this function isn't particularly intuitive, it's used inside PostgreSQL partitions to ensure data integrity. It's also used by PgDog to prevent incorrectly sharded rows from being
sent to shards. See [logical replication](internals/logical-replication/index.md) for more details on the implementation.

## Supported data types

The sharding function is taken directly from Postgres source code, so it supports all data types that can be used for partitioning tables: integers, strings, UUIDs, etc. PgDog currently supports sharding on `BIGINT` and `UUIDv4` types automatically. More types will be added, as needed.
