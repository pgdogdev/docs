---
icon: material/call-split
---

# Sharded tables

To detect and route queries with sharding keys, PgDog expects the sharded column to be specified in the configuration. Each sharded table should be specified separately, unless the column has the same name in all tables, in which case, the table name can be omitted.

## Table-based sharding

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

## Column-based sharding

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

Currently, PgDog supports sharding `BIGINT` (incl. `BIGSERIAL`), `INTEGER` (incl. `SERIAL`), `UUID` and `VARCHAR` (incl. `TEXT`).

The data type for each column must be specified so PgDog can correctly extract it from queries, for example:

=== "BIGINT"

    ```toml
    [[sharded_tables]]
    database = "prod"
    column = "user_id"
    data_type = "bigint" # Alias for integer, bigserial, serial
    ```

=== "VARCHAR / TEXT"

    ```toml
    [[sharded_tables]]
    database = "prod"
    column = "country"
    data_type = "varchar" # Alias for text
    ```

=== "UUID"

    ```toml
    [[sharded_tables]]
    database = "prod"
    column = "ident"
    data_type = "uuid"
    ```

## Configuration

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

## Shard by list and range

By default, PgDog uses hash-based sharding, with data evenly split between shards. If you want to organize your data differently, you can use list-based and range-based sharding.

List-based sharding uses the same algorithm as Postgres' `PARTITION BY LIST` and range-based uses `PARTITION BY RANGE`.

To configure either one, add a `mapping` to the table's `[[sharded_tables]]` entry.

### Shard by list

=== "pgdog.toml"

    ```toml
    [[sharded_tables]]
    database = "prod"
    column = "tenant_id"

    [[sharded_tables.mapping]]
    values = [1, 2, 3, 4, 5]
    shard = 0

    [[sharded_tables.mapping]]
    values = [6, 7, 8]
    shard = 1
    ```

=== "Helm chart"

    ```yaml
    shardedTables:
      - database: prod
        column: tenant_id
        mapping:
          - values: [1, 2, 3, 4, 5]
            shard: 0
          - values: [6, 7, 8]
            shard: 1
    ```

!!! note "Configuration format"

    If configuring `pgdog.toml` directly, make sure to specify the `mapping` entries directly below the table they are referring to.

### Shard by range

=== "pgdog.toml"

    ```toml
    [[sharded_tables]]
    database = "prod"
    column = "tenant_id"

    [[sharded_tables.mapping]]
    start = 1
    end = 5
    shard = 0

    [[sharded_tables.mapping]]
    start = 5
    end = 10
    shard = 1
    ```

=== "Helm chart"

    ```yaml
    shardedTables:
      - database: prod
        column: tenant_id
        mapping:
          - start: 1
            end : 5
            shard: 0
          - start: 5
            end: 10
            shard: 1
    ```

!!! note "Configuration format"

    If configuring `pgdog.toml` directly, make sure to specify the `mapping` entries directly below the table they are referring to.

### Mapping fields

Each rule has a target `shard` and the fields that define which values it matches.

#### `values`

A set of values that route to this shard. Setting `values` makes the rule a list mapping.

#### `start`

The starting value of a range, inclusively. Setting `start` and/or `end` makes the rule a range mapping. You can omit this setting, which will make the range partially unbounded.

#### `end`

The ending value of a range, exclusively. You can omit this setting, which will make the range partially unbounded.

#### `shard`

The target shard number for matched values.

### Default mapping

Specifying a mapping with no values or range will make that rule the default routing for all queries that don't match any other rules.

For example:

=== "pgdog.toml"

    ```toml
    [[sharded_tables]]
    database = "prod"
    column = "tenant_id"

    [[sharded_tables.mapping]]
    shard = 2
    ```

=== "Helm chart"

    ```yaml
    shardedTables:
      - database: prod
        column: tenant_id
        mapping:
          - shard: 2
    ```
