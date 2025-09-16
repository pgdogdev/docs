---
icon: material/function
---
# Sharding functions

The sharding function inside PgDog transforms column values in SQL queries to specific shard numbers. They are in turn used for routing queries to one or more databases in the [configuration](../../configuration/index.md).

## How it works

PgDog sharding function is based off of PostgreSQL declarative partitions. This choice is intentional: it allows data to be sharded both inside PgDog and inside PostgreSQL with the use of partitions.

PgDog supports all 3 partition functions:

- `HASH`
- `LIST`
- `RANGE`

Their attributes are configurable in [`pgdog.toml`](../../configuration/pgdog.toml/sharded_tables.md) on a per-table/column basis.

### Hash

The hash function evenly distributes data between all shards. It ingests bytes and returns a single 64-bit unsigned integer which we then modulo by the number of shards in the configuration.

<center>
`hash(user_id) mod shards`
</center>


The hash function is used by default when configuring sharded tables in `pgdog.toml`:

```toml
[[sharded_tables]]
database = "prod"
column = "user_id"
data_type = "bigint"
```

All queries referencing the `user_id` column will be automatically sent to the matching shard(s) and data in those tables will be split between all shards evenly.

<!-- For hash-based sharding, to achieve the same inside the database, you can use the `satisfies_hash_partition` function: -->

<!-- ```postgresql -->
<!-- SELECT satisfies_hash_partition( -->
  <!-- 'data'::regclass, -- Partitioned table. -->
  <!-- 3, -- Number of shards. -->
  <!-- 0, -- A shard number. -->
  <!-- 1 -- Sharding key. -->
<!-- ); -->
<!-- ``` -->

<!-- This function will return true if the sharding key should be placed in the specified shard, given the total number of shards in the cluster. -->

<!-- While the interface of this function isn't particularly intuitive, it's used inside PostgreSQL partitions to ensure data integrity. It's also used by PgDog to prevent incorrectly sharded rows from being -->
<!-- sent to shards. See [logical replication](internals/logical-replication/index.md) for more details on the implementation. -->

### List

The list function distributes data between shards according to a value-to-shard mapping. It's useful when you want to control where the data lands exactly in your sharded cluster. The most common use case for this is [multitenancy](../multi-tenancy.md).

To enable this sharding function on a table or column, add the value mappings to `pgdog.toml`, for example:

```toml
[[sharded_mappings]]
database = "prod"
column = "user_id"
values = [1, 2, 3]
shard = 0
```

This sends users with the IDs 1, 2 and 3 to shard 0. Unlike [hash](#hash) sharding, a mapping is required for all values of the sharding key. If a value is used that doesn't have a mapping, by default, the query will be sent to all shards.

!!! note
    The `sharded_tables` entry is still required for list and range sharding. It specifies the data type of the column which tells PgDog how to parse its value at runtime.

### Range

Sharding by range is similar to list-based algorithm except instead of specifying the values explicitly, you can specify a bounding range. All values which are included in the range will be sent to the specified shard:

```toml
[[sharded_mappings]]
database = "prod"
column = "user_id"
start = 1
end = 100
shard = 0
```

This sends users with IDs 1 through 100 (exclusively) to shard 0. For open-ended ranges, you can specify either the `start` or the `end` value. The start is included while the end is excluded.

## Supported data types

PostgreSQL has dozens of data types. PgDog supports a subset of those for sharding purposes and they are listed below.

!!! note
    This list will continue to get longer as the development of PgDog continues. Check back soon or file an issue to request support for a data type you need.

| Data type | Hash | List | Range |
|-|-|-|-|
| `BIGINT` | :material-check-circle-outline: | :material-check-circle-outline: | :material-check-circle-outline: |
| `VARCHAR` / `TEXT` | :material-check-circle-outline: | :material-check-circle-outline: | No |
| `UUID` | :material-check-circle-outline: | :material-check-circle-outline: | No |
