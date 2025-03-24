# Sharded tables

To detect (and route) sharded queries, PgDog expects the sharded column, and optionally, the tables, to be specified in the configuration. For example:

```toml
[[sharded_tables]]
database = "prod"
table = "users"
column = "id"
data_type = "bigint"
```

All queries that reference the `"users"."id"` column will be routed to the correct shard(s) automatically.

If a column is a foreign key, you can specify just the column name, as long as it's uniquely named. For example:

```toml
[[sharded_tables]]
database = "prod"
column = "user_id"
data_type = "bigint"
```

All queries that reference the `"user_id"` column in _any_ table will be sharded and routed to the right shard(s).

## Data types

Currently, PgDog supports sharding `BIGINT` (and `BIGSERIAL`) and `UUID`. The data type for each table/column must be specified so PgDog can correctly decode it at runtime.

### `database`

Name of the database in `[[databases]]` section the sharded table belongs to.

### `table`

Name of the sharded PostgreSQL table. Must not contain the schema name, just the table name. Identical table names in multiple schemas are not supported (yet).

### `column`

Name of the sharded column.

### `data_type`

The data type of the column. Currently, the options are:

- `bigint`
- `uuid`
