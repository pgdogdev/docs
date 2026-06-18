---
icon: material/call-split
---

# Sharded tables

To detect and route queries with sharding keys, PgDog expects the sharded column to be specified in the configuration. Each sharded table should be specified separately, unless the column has the same name in all tables, in which case, the table name can be omitted.

## Examples

### Table-based sharding

The following configuration will match queries referring to this exact table and column exclusively:

=== "pgdog.toml"
    ```toml
    [[sharded_tables]]
    database = "prod"
    name = "users"
    column = "id"
    data_type = "bigint"
    ```
=== "Helm chart"
    ```yaml
    shardedTables:
      - database: prod
        name: users
        column: id
        dataType: bigint
    ```

The table `users` is sharded on the column `id`, which has the data type `BIGINT`. Queries that reference that column will be automatically routed to one or more of the shards:

```postgresql
SELECT users.* FROM users
INNER JOIN orders ON orders.user_id = users.id
WHERE users.id = $1
```

### Column-based sharding

The following configuration will match queries referring to this column, irrespective of table name:

=== "pgdog.toml"
    ```toml
    [[sharded_tables]]
    database = "prod"
    column = "user_id"
    data_type = "bigint"
    ```
=== "Helm chart"
    ```yaml
    shardedTables:
      - database: prod
        column: user_id
        dataType: bigint
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

=== "pgdog.toml"
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
=== "Helm chart"
    ```yaml
    omnishardedTables:
      - database: prod
        sticky: true
        tables:
          - settings
          - cities
          - terms_of_service
          - ip_blocks
    ```

All queries referencing only these tables will be sent to one of the shards, using the round robin algorithm. If the query contains a sharding key, it will be used instead and omnisharded tables will be ignored by the query router.

## Shard by list and range

By default, PgDog uses hash-based sharding, with data evenly split between shards. If you want to organize your data differently, you can use list-based and range-based sharding. List-based sharding uses the same algorithm as Postgres' `PARTITION BY LIST` and range-based uses `PARTITION BY RANGE`.

To configure either one, add a `mapping` to the table's `[[sharded_tables]]` entry. Each rule assigns an explicit set of values (list), a bounded range (range), or everything else (default) to a shard. PgDog infers the rule type from the fields you set.

A mapping is a list of rules attached to a `[[sharded_tables]]` entry. TOML gives you two equivalent ways to write that list:

- One `[[sharded_tables.mapping]]` block per rule. The double square brackets are TOML's syntax for an array, so repeating the block simply appends another rule (this is the style used in the examples below). Each block attaches to the most recently defined `[[sharded_tables]]`, so place a table's mapping blocks directly after its entry and before the next `[[sharded_tables]]`.
- A single inline array, e.g. `mapping = [ { values = [1, 2], shard = 0 }, { shard = 1 } ]`, where each `{ ... }` is one rule.

Both forms produce exactly the same configuration, so use whichever is easier to read.

Each rule has a target `shard` plus the fields that define which values it matches:

### `values`

A set of values that route to this shard. Setting `values` makes the rule a **list** rule (`PARTITION BY LIST`).

### `start`

The starting value of a range, inclusive. Setting `start` and/or `end` makes the rule a **range** rule (`PARTITION BY RANGE`). Omit `start` for a range that is unbounded below.

### `end`

The ending value of a range, exclusive. Omit `end` for a range that is unbounded above.

### `shard`

The target shard number for matched values. A rule with only `shard` set (no `values`, `start`, or `end`) is the **default** rule: a catch-all for any value not matched by a list or range rule.

!!! note
    The rule type is inferred from the fields present: `values` → list, `start`/`end` → range, `shard` alone → default. PgDog resolves a value against list rules first, then range rules, then the default.

## Mapping examples

### Lists

A list rule routes an explicit set of values to a shard:

=== "pgdog.toml"
    ```toml
    [[sharded_tables]]
    database = "prod"
    column = "tenant_id"
    data_type = "bigint"

    [[sharded_tables.mapping]]
    values = [1, 2, 3, 4, 5]
    shard = 0
    ```
=== "Helm chart"
    ```yaml
    shardedTables:
      - database: prod
        column: tenant_id
        dataType: bigint
        mapping:
          - values: [1, 2, 3, 4, 5]
            shard: 0
    ```

All queries that match the values defined in the mapping will be routed to that specific shard, for example:

```postgresql
UPDATE users SET last_login = NOW()
WHERE tenant_id = 4 AND user_id = 1235
```

### Range

A range rule is defined with a starting value (included) and an ending value (excluded), just like `PARTITION BY RANGE` in Postgres:

=== "pgdog.toml"
    ```toml
    [[sharded_tables]]
    database = "prod"
    column = "tenant_id"
    data_type = "bigint"

    [[sharded_tables.mapping]]
    start = 1
    end = 100
    shard = 0
    ```
=== "Helm chart"
    ```yaml
    shardedTables:
      - database: prod
        column: tenant_id
        dataType: bigint
        mapping:
          - start: 1
            end: 100
            shard: 0
    ```

All sharding key values matching the range will be routed to the specified shard:

```postgresql
UPDATE users SET deleted_at = NOW()
WHERE tenant_id IN (1, 2, 5, 10, 56)
```

### Default

A rule with only a `shard` set — no `values`, `start`, or `end` — is the default: a fallback for any value not matched by a list or range rule.

=== "pgdog.toml"
    ```toml
    [[sharded_tables]]
    database = "prod"
    column = "tenant_id"
    data_type = "bigint"

    [[sharded_tables.mapping]]
    shard = 2
    ```
=== "Helm chart"
    ```yaml
    shardedTables:
      - database: prod
        column: tenant_id
        dataType: bigint
        mapping:
          - shard: 2
    ```

On its own, a default rule routes every value to the same shard. It's most useful alongside list or range rules, as a catch-all for the values they don't cover (see [below](#combining-list-range-and-default)).

### Combining list, range, and default

All three rule types can be used together in the same table. PgDog evaluates a value against the **list** rules first, then the **range** rules, and finally falls back to the **default** rule:

=== "pgdog.toml"
    ```toml
    [[sharded_tables]]
    database = "prod"
    column = "tenant_id"
    data_type = "bigint"

    # list: tenant_id 1, 2, or 3 -> shard 0
    [[sharded_tables.mapping]]
    values = [1, 2, 3]
    shard = 0

    # range: 100 <= tenant_id < 200 -> shard 1 (start included, end excluded)
    [[sharded_tables.mapping]]
    start = 100
    end = 200
    shard = 1

    # default: any value not matched above -> shard 2
    [[sharded_tables.mapping]]
    shard = 2
    ```
=== "Helm chart"
    ```yaml
    shardedTables:
      - database: prod
        column: tenant_id
        dataType: bigint
        mapping:
          # list: tenant_id 1, 2, or 3 -> shard 0
          - values: [1, 2, 3]
            shard: 0
          # range: 100 <= tenant_id < 200 -> shard 1 (start included, end excluded)
          - start: 100
            end: 200
            shard: 1
          # default: any value not matched above -> shard 2
          - shard: 2
    ```

With this configuration, `tenant_id = 2` is routed to shard 0 (list match), `tenant_id = 150` to shard 1 (range match), and `tenant_id = 5000` to shard 2 (default). Without a default rule, a value that matches no list or range rule is sent to [all shards](../../features/sharding/cross-shard-queries/index.md).
