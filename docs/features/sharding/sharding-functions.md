---
icon: material/function
---
# Sharding functions

The sharding functions determine how to route SQL queries to one or more shard numbers. They can use arbitrary input data to make this decision, and PgDog supports multiple sharding functions. Once a shard number is determined, PgDog will send the query to one or more databases configured in [`pgdog.toml`](../../configuration/pgdog.toml/databases.md).

## Supported functions

Currently, PgDog supports two sharding functions:

| Sharding function | Description |
|-|-|
| [Column-based](#column-based-sharding) | Uses one of the three supported Postgres partition functions and applies them to a specific column value, e.g., `tenant_id` to produce a shard number. |
| [Schema-based](#schema-based-sharding) | Maps different PostgreSQL schemas (e.g., `public`) to different shard numbers, allowing to physically separate different schemas. |

## Column-based sharding

The PgDog column sharding function is based on PostgreSQL declarative partitions. This choice is intentional: it allows data to be sharded both inside PgDog and inside PostgreSQL, with the use of the same partition functions.

PgDog supports all three PostgreSQL partition functions:

| Function | Description |
|-|-|
| Hash | `PARTITION BY HASH` function, using an internal hashing function implemented by both PgDog and PostgreSQL. |
| List | `PARTITION BY LIST` function, used for splitting rows by an explicitly defined mapping of values to shard numbers. |
| Range| `PARTITION BY RANGE` function, similar to list sharding, except the mapping is defined using a bounded range. |

The sharding functions are configurable in [`pgdog.toml`](../../configuration/pgdog.toml/sharded_tables.md) on a per-table and/or per-column basis, for example:

=== "pgdog.toml"
    ```toml
    [[sharded_tables]]
    database = "prod"
    column = "tenant_id"
    ```
=== "Helm chart"
    ```yaml
    shardedTables:
      - database: prod
        column: tenant_id
    ```

By default, PgDog uses the hash-based function which can, theoretically, handle any data type. PgDog currently supports sharding on all integers, text (incl. `VARCHAR`), and UUID columns. By default, the sharded tables configuration uses integer, and you can specify a different data type as follows:

=== "pgdog.toml"
    ```toml
    [[sharded_tables]]
    database = "prod"
    column = "tenant_id"
    data_type = "uuid" # or "varchar"
    ```
=== "Helm chart"
    ```yaml
    shardedTables:
      - database: prod
        column: tenant_id
        dataType: uuid # or varchar
    ```

The data type needs to be known at runtime so PgDog can safely parse and interpret queries without talking to the database. This also allows it to resolve the data type in ambiguous situations, e.g., when using [query comments](manual-routing.md#query-comment) for routing queries.

### Table/column matching

The sharded tables configuration uses greedy matching to find tables and columns. For example, if the configuration only specifies the `column`, the config will match all tables that have that column. This is especially useful when the database schema follows some kind of convention for naming columns (as all good schema designs should).

To match a specific table/column combination, you can specify the table name as follows:

=== "pgdog.toml"
    ```toml
    [[sharded_tables]]
    database = "prod"
    table = "users"
    column = "company_id"
    ```
=== "Helm chart"
    ```yaml
    shardedTables:
      - database: prod
        table: users
        column: company_id
    ```

This makes PgDog's sharding configuration flexible and forgiving of the realities of running PostgreSQL in production. As long as you can find and configure all required sharding keys, query routing will work as expected.

!!! note "Multiple sharding functions"
    Since sharding is configured for each table or column name, this allows storing tables
    with different sharding functions in the same database.

    While this works for some [cross-shard](cross-shard-queries/index.md) queries, joins between tables using a different sharding function are not going to work for [direct-to-shard](query-routing.md) queries.


### Why Postgres partitions

We often get asked why we chose PostgreSQL partitions for sharding Postgres. There are indeed better hash functions, e.g., rendez-vous hashing, which minimizes the amount of data movement when changing the number of shards later on.

Partition functions allow you to reshard data both inside PgDog and inside Postgres. For example, if you already have partitioned several tables (usually the biggest and most used ones) and you just want to move those to different PostgreSQL servers, you can do so with logical replication or even with just `pg_dump`.

This makes the initial step for sharding your database that much easier and doesn't require you to use our (currently experimental) [resharding](resharding/index.md) implementation.

### List-based sharding

The list sharding function distributes data between shards according to a value <-> shard mapping. It's useful for low-cardinality sharding keys, like country codes or region names, or when you want to control how your data is distributed between the data nodes. The most common use case for this is [multitenant](../multi-tenancy.md) systems.

To enable this sharding function on a table or column, you need to specify additional value <-> shard mappings in [`pgdog.toml`](../../configuration/pgdog.toml/sharded_tables.md), for example:

=== "pgdog.toml"
    ```toml
    [[sharded_mappings]]
    database = "prod"
    column = "user_id"
    kind = "list"
    values = [1, 2, 3]
    shard = 0
    ```
=== "Helm chart"
    ```yaml
    shardedMappings:
      - database: prod
        column: user_id
        kind: list
        values: [1, 2, 3]
        shard: 0
    ```

This example will route all queries with `user_id` equal to `1`, `2`, and `3` to shard zero. Unlike [hash](#column-based-sharding) sharding, a value <-> shard mapping is usually required for _all_ values of the sharding key. If a value is used that doesn't have a mapping and a [fallback](#fallback-shard) routing configuration isn't specified, the query will be sent to [all shards](cross-shard-queries/index.md).

!!! note "Required configuration"
    The `[[sharded_tables]]` configuration entry is still required for list-based sharding. It specifies the data type of the column, which tells PgDog how to parse its value at runtime.
    
### Range-based sharding

Sharding by range is similar to [list](#list-based-sharding) sharding, except instead of specifying the values explicitly, you can specify a bounding range. All values that are included in the range will be sent to the specified shard, for example:

=== "pgdog.toml"
    ```toml
    [[sharded_mappings]]
    database = "prod"
    column = "user_id"
    kind = "range"
    start = 1
    end = 100
    shard = 0
    ```
=== "Helm chart"
    ```yaml
    shardedMappings:
      - database: prod
        column: user_id
        kind: range
        start: 1
        end: 100
        shard: 0
    ```

This example will route queries that refer to the `user_id` column, with values between 1 and 100 (exclusively), to shard zero. For open-ended ranges, you can specify either the `start` or the `end` value. The start value is included in the range, while the end value is excluded (same as PostgreSQL partitions).

!!! note "Required configuration"
    The `[[sharded_tables]]` configuration entry is still required for range-based sharding. It specifies the data type of the column, which tells PgDog how to parse its value at runtime.


### Fallback shard

If you don't want to specify an exhaustive list of values, PgDog accepts a default (or fallback) mapping which will match all queries that are not otherwise configured using other `[[sharded_mapping]]` entries:

=== "pgdog.toml"
    ```toml
    [[sharded_mappings]]
    database = "prod"
    column = "user_id"
    kind = "default"
    shard = 1
    ```
=== "Helm chart"
    ```yaml
    shardedMappings:
      - database: prod
        column: user_id
        kind: default
        shard: 1
    ```

This is identical to `PARTITION OF [...] DEFAULT` behavior in PostgreSQL.

## Supported data types

!!! note "Work in progress"
    This list will continue to get longer as the development of PgDog continues. Check back soon or [create an issue](https://github.com/pgdogdev/pgdog/issues) to request support for a data type you need.


PostgreSQL has dozens of data types. PgDog supports a subset of those for sharding purposes and they are listed below:

| Data type | Hash | List | Range | Configuration |
|-|-|-|-|-|
| `BIGINT` / `INTEGER` / `SMALLINT` | :material-check-circle-outline: | :material-check-circle-outline: | :material-check-circle-outline: | `"bigint"` |
| `VARCHAR` / `TEXT` | :material-check-circle-outline: | :material-check-circle-outline: | No | `"varchar"` |
| `UUID` | :material-check-circle-outline: | :material-check-circle-outline: | No | `"uuid"` |

## Schema-based sharding

In addition to splitting the tables themselves, PgDog can shard Postgres databases by placing different schemas on different shards. This is useful for multi-tenant applications that have stricter separation between their users' data.

When enabled, PgDog will route queries that fully qualify tables based on their respective schema names. Additionally, it can use the `search_path` session variable to infer the schema name for specified tables and use that for routing queries instead.

### Schema-to-shard mapping

Just like [column-based sharding](#column-based-sharding), schemas can be mapped to their shards with configuration in [`pgdog.toml`](../../configuration/pgdog.toml/sharded_schemas.md):

=== "pgdog.toml"
    ```toml
    [[sharded_schemas]]
    database = "prod"
    name = "customer_a"
    shard = 0

    [[sharded_schemas]]
    database = "prod"
    name = "customer_b"
    shard = 1
    ```
=== "Helm chart"
    ```yaml
    shardedSchemas:
      - database: prod
        name: customer_a
        shard: 0
      - database: prod
        name: customer_b
        shard: 1
    ```

Queries that include the schema name in the tables they are referring to can be routed to the right shard. For example:

```postgresql
SELECT * FROM customer_a.users WHERE email = $1;
```

Since the `users` table is fully qualified as `customer_a.users`, the query will be routed to shard zero.

Alternatively, the application can dynamically set the `search_path` session variable to the desired schema before executing the query, for example:

```postgresql
SET search_path TO customer_a, public;
```

Schemas are evaluated in order specified in the statement, and the first schema that matches a configuration entry in `pgdog.toml` is chosen for routing all subsequent queries.

### DDL

Unlike other sharding functions, schema-based sharding will also route DDL (e.g., `CREATE TABLE`, `CREATE INDEX`, etc.) queries to their respective shard, as long as the entity name is fully qualified or `search_path` is set:

```postgresql
CREATE TABLE customer_b.users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR NOT NULL
);

CREATE UNIQUE INDEX ON customer_b.users USING btree(email);
```

Alternatively, you can:

```postgresql
SET search_path TO customer_b, public;

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR NOT NULL
);
```

All of these DDL statements will be sent to shard one, because they explicitly refer to tables in schema `customer_b`, which is mapped to shard one in the configuration.

### Default routing

If a schema isn't mapped to a shard number, PgDog will fallback to using other configured sharding functions. If none are set, the query will be sent to all shards.

To avoid this behavior and send all other queries to a particular shard, you can add a default schema mapping, for example:

=== "pgdog.toml"
    ```toml
    [[sharded_schemas]]
    database = "prod"
    shard = 0
    ```
=== "Helm chart"
    ```yaml
    shardedSchemas:
      - database: prod
        shard: 0
    ```

This will send all queries that don't specify a schema or use a schema without a mapping to shard zero.

### Why shard on schema

Schema-based sharding is really easy to deploy and use, since it has very explicit separation between data and will almost always use [direct-to-shard](query-routing.md) queries to serve requests. That makes it 100% compatible with all PostgreSQL features, while allowing you to scale your database horizontally.

## Read more

{{ next_steps_links([
    ("COPY command", "cross-shard-queries/copy.md", "Bulk load data across shards with the COPY protocol."),
    ("Two-phase commit", "2pc.md", "Atomic transactions spanning multiple shards."),
]) }}
