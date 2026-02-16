---
icon: material/call-split
---

# Sharded tables

To detect and route queries with sharding keys, PgDog expects the sharded column to be specified in the configuration. Each sharded table should be specified separately, unless the column has the same name in all tables, in which case, the table name can be omitted.

## Examples

### Table-based sharding

The following configuration will match queries referring to this exact table and column exclusively:

```toml
[[sharded_tables]]
database = "prod"
name = "users"
column = "id"
data_type = "bigint"
```

The table `users` is sharded on the column `id`, which has the data type `BIGINT`. Queries that reference that column will be automatically routed to one or more of the shards:

```postgresql
SELECT users.* FROM users
INNER JOIN orders ON orders.user_id = users.id
WHERE users.id = $1
```

### Column-based sharding

The following configuration will match queries referring to this column, irrespective of table name:

```toml
[[sharded_tables]]
database = "prod"
column = "user_id"
data_type = "bigint"
```

In this example, the table name is omitted so all tables that have the `user_id` column (data type `BIGINT`) will be routed automatically to the right shard(s):

```postgresql
INSERT INTO orders (user_id, amount) VALUES ($1, $2) RETURNING *
```

This works especially well if you are following a convention for your column names. For example, `user_id` would typically be a foreign key reference to `"users"."id"`, which would be referenced from almost all tables. Following a convention for naming columns allows you to keep the configuration short and error-free.

## Data types

Currently, PgDog supports sharding `BIGINT` (and `BIGSERIAL`), `UUID`, `VARCHAR` (and `TEXT`) and `vector`. The data type for each column must be specified so PgDog can correctly decode it in each query.

## Fields

### `database`

The name of the database in [`[[databases]]`](databases.md) section in which the table is located. PgDog supports sharding thousands of databases and tables in the same configuration file.

### `schema`

The name of the PostgreSQL schema where the sharded table is located. This is optional. If not set, all schemas will be sharded.

### `name`

The name of the PostgreSQL table. Only columns explicitly referencing that table will be sharded.

The name must not contain the schema name, just the table name.

### `column`

The name of the sharded column.

### `data_type`

The data type of the column. Currently supported options are:

- `bigint`
- `uuid`
- `varchar`
- `vector`

### `hasher`

The hash function to use for sharding. Available options:

- `postgres` (default) - PostgreSQL's native hash function
- `sha1` - SHA-1 hash function

### `centroids`

For vector sharding, specify the centroid vectors directly in the configuration. This is useful for small centroid sets.

### `centroids_path`

Path to a JSON file containing centroid vectors. This is useful when centroids are large (1000+ dimensions) and impractical to embed in `pgdog.toml`.

### `centroid_probes`

Number of centroids to probe during vector similarity search. If not specified, defaults to the square root of the number of centroids.

## Omnisharded tables

[Omnisharded](../../features/sharding/omnishards.md) tables are tables that have the same data on all shards. They typically are small and contain metadata, e.g., list of countries, cities, etc., and are used in joins. PgDog allows to read from these tables directly and load balances traffic evenly across all shards.

By default, all tables unless otherwise configured as sharded, are considered omnisharded.

#### Sticky routing

Sticky routing disables round robin for omnisharded tables and sends the queries touching those tables to the same shard, guaranteeing consistent results for the duration of a client's connection:

```toml
[[omnisharded_tables]]
database = "prod"
sticky = true
tables = [
    "settings",
    "cities",
    "terms_of_service",
    "ip_blocks",
]
```

All queries referencing only these tables will be sent to one of the shards, using the round robin algorithm. If the query contains a sharding key, it will be used instead and omnisharded tables will be ignored by the query router.

## Shard by list and range

!!! note "Required configuration"
    The `[[sharded_tables]]` configuration entry is still required for list and range sharding. It specifies the data type of the column, which tells PgDog how to parse its value at runtime.


By default, PgDog uses hash-based sharding, with data evenly split between shards. If you want to organize your data differently, you can use list-based and range-based sharding. List-based sharding uses the same algorithm as Postgres' `PARTITION BY LIST` and range-based uses `PARTITION BY RANGE`.

To configure either one, you need to specify the value-to-shard mapping in the configuration.

## Mapping fields

!!! note
    The `column`, `table`, and `schema` fields must match a corresponding `[[sharded_tables]]` entry.

### `database`

The name of the database in [`[[databases]]`](databases.md) section.

### `column`

The name of the column to match for routing. Must match a `column` in `[[sharded_tables]]`.

### `table`

The name of the table to match. Must match a `name` in `[[sharded_tables]]` if specified there. This is optional.

### `schema`

The name of the PostgreSQL schema to match. Must match a `schema` in `[[sharded_tables]]` if specified there. This is optional.

### `kind`

The type of mapping. Available options:

- `list`: match specific values (i.e., `PARTITION BY LIST`)
- `range`: match a range of values (i.e., `PARTITION BY RANGE`)
- `default`: fallback for unmatched values (list-based sharding only)

### `values`

For `list` mappings, the set of values that route to this shard.

### `start`

For `range` mappings, the starting value (inclusive).

### `end`

For `range` mappings, the ending value (exclusive).

### `shard`

The target shard number for matched queries.

## Mapping examples

### Lists

Lists are defined as a list of values and a corresponding shard number. Just like sharded tables, the mapping is database and column (and optionally, table and schema) specific:

```toml
[[sharded_mappings]]
database = "prod"
column = "tenant_id"
kind = "list"
values = [1, 2, 3, 4, 5]
shard = 0
```

All queries that match the values defined in the mapping will be routed to that specific shard, for example:

```postgresql
UPDATE users SET last_login = NOW()
WHERE tenant_id = 4 AND user_id = 1235
```

### Range

Ranges are defined with a starting value (included) and the end value (excluded), just like `PARTITION BY RANGE` in Postgres:

```toml
[[sharded_mappings]]
database = "prod"
column = "tenant_id"
kind = "range"
start = 1
end = 100
shard = 0
```

 All sharding key values matching the range will be routed to the specified shard:

```postgresql
UPDATE users SET deleted_at = NOW()
WHERE tenant_id IN (1, 2, 5, 10, 56)
```

### Default

The `default` kind specifies a fallback shard for values that don't match any list mapping:

```toml
[[sharded_mappings]]
database = "prod"
column = "tenant_id"
kind = "default"
shard = 2
```

Any sharding key value that doesn't match an explicit list mapping will be routed to the default shard.

!!! note
    The `default` kind only works with list-based sharding, not range-based sharding.
