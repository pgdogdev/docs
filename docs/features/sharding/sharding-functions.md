---
icon: material/function
---
# Sharding functions

The sharding function inside PgDog transforms column values in SQL queries to specific shard numbers. They are in turn used for routing queries to one or more databases in the [configuration](../../configuration/pgdog.toml/databases.md).

## How it works

PgDog sharding function is based on PostgreSQL declarative partitions. This choice is intentional: it allows data to be sharded both inside PgDog and inside PostgreSQL, with the use of the same partition functions.

PgDog supports all three PostgreSQL partition functions and uses them for sharding data between nodes:

| Function | Description |
|-|-|
| Hash | `PARTITION BY HASH` function, using a special hashing function implemented by both PgDog and Postgres. |
| List | `PARTITION BY LIST` function, used for splitting rows by an explicitly defined mapping of values to shard numbers. |
| Range| `PARTITION BY RANGE` function, similar to list sharding, except the mapping is defined with a bounded range. |

The sharding functions are configurable in [`pgdog.toml`](../../configuration/pgdog.toml/sharded_tables.md) on a per-table and/or per-column basis.

!!! note "Multiple sharding functions"
    Since sharding is configured for each table or column name, this allows storing tables
    with different sharding functions in the same database.

    While this works for some [cross-shard](cross-shard.md) queries, joins between tables using a different sharding function are not possible for [direct-to-shard](query-routing.md) queries.


## Hash

The hash function evenly distributes data between all shards. It ingests bytes and returns a single 64-bit unsigned integer which we then modulo by the number of shards in the configuration.

<center>
`hash(user_id) mod shards`
</center>


The hash function is used by default when configuring sharded tables in [`pgdog.toml`](../../configuration/pgdog.toml/sharded_tables.md):

```toml
[[sharded_tables]]
database = "prod"
column = "user_id"
data_type = "bigint"
```

All queries referencing the `user_id` column will be automatically sent to the matching shard(s) and data in those tables will be split between all data nodes evenly. See below for a list of [supported](#supported-data-types) data types. Each can be specified as follows:

=== "Integers"
    !!! note "Integer types"
        Different integer types are treated the same by the query router. If you're using `BIGINT`, `INTEGER` or `SMALLINT` as your sharding key, you can specify `bigint` in the configuration:

    ```toml
    data_type = "bigint"
    ```
=== "Text"
    !!! note "Text types"
        `VARCHAR`, `VARCHAR(n)`, and `TEXT` use the same encoding and are treated the same by the query router. For either one, you can specify `varchar` in the configuration:
    ```toml
    data_type = "varchar"
    ```
=== "UUID"
    !!! note "UUID types"
        Only UUIDv4 is currently supported for sharding in the query router.
    ```toml
    data_type = "uuid"
    ```

## List

The list sharding function distributes data between shards according to a value <-> shard mapping. It's useful for low-cardinality sharding keys, like country codes or region names, or when you want to control how your data is distributed between the data nodes. The most common use case for this is [multitenant](../multi-tenancy.md) systems.

To enable this sharding function on a table or column, you need to specify additional value <-> shard mappings in [`pgdog.toml`](../../configuration/pgdog.toml/sharded_tables.md), for example:

```toml
[[sharded_mappings]]
database = "prod"
column = "user_id"
kind = "list"
values = [1, 2, 3]
shard = 0
```

This example will route all queries with `user_id` equals to one, two or three to shard zero. Unlike [hash](#hash) sharding, a value <-> shard mapping is required for _all_ values of the sharding key. If a value is used that doesn't have a mapping, the query will be sent to [all shards](cross-shard.md).

!!! note "Required configuration"
    The `[[sharded_tables]]` configuration entry is still required for list and range sharding. It specifies the data type of the column, which tells PgDog how to parse its value at runtime.

## Range

Sharding by range function is similar to [list](#list) sharding function, except instead of specifying the values explicitly, you can specify a bounding range. All values which are included in the range will be sent to the specified shard, for example:

```toml
[[sharded_mappings]]
database = "prod"
column = "user_id"
kind = "range"
start = 1
end = 100
shard = 0
```

This will route queries that refer to the `user_id` column, with values between 1 and 100 (exclusively), to shard zero. For open-ended ranges, you can specify either the `start` or the `end` value. The start value is included in the range, while the end value is excluded.

!!! note "Required configuration"
    The `[[sharded_tables]]` configuration entry is still required for list and range sharding. It specifies the data type of the column, which tells PgDog how to parse its value at runtime.


## Supported data types

PostgreSQL has dozens of data types. PgDog supports a subset of those for sharding purposes and they are listed below.

!!! note "Work in progress"
    This list will continue to get longer as the development of PgDog continues. Check back soon or [create an issue](https://github.com/pgdogdev/pgdog/issues) to request support for a data type you need.

| Data type | Hash | List | Range |
|-|-|-|-|
| `BIGINT` / `INTEGER` / `SMALLINT` | :material-check-circle-outline: | :material-check-circle-outline: | :material-check-circle-outline: |
| `VARCHAR` / `TEXT` | :material-check-circle-outline: | :material-check-circle-outline: | No |
| `UUID` | :material-check-circle-outline: | :material-check-circle-outline: | No |

## Read more

- [COPY command](copy.md)
- [Two-phase commit](2pc.md)
