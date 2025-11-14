---
icon: material/set-split
---

# Sharded schemas

[Schema-based sharding](../../features/sharding/sharding-functions.md#schema-based-sharding) places data from tables in different Postgres schemas on their own shards.

## Example

Each schema needs to have a shard mapping in the config, for example:

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

All queries that fully qualify the table names will be routed correctly, for example:

```postgresql
SELECT * FROM customer_a.users -- Prefixed with the schema name.
WHERE admin = true;
```

You can add multiple entries per database. Mappings are matched by schema name first; if none match, PgDog falls back to a default rule.

## Default shard

For queries that don't specify a schema or for which a mapping doesn't exist, the default behavior is to send it to all shards. If this is not desirable, add an entry without a `name` to choose a default shard:

```toml
[[sharded_schemas]]
database = "prod"
shard = 0
```

PgDog now sends any unmapped schema to shard zero, including plain references (`SELECT * FROM pg_stat_activity`) and schemas created after the mapping file was generated.

## Broadcast mappings

If you need a single configuration entry to cover “all shards”, set `all = true`. PgDog still accepts a `name` for documentation purposes, but ignores the shard number and forwards the query to every shard:

```toml
[[sharded_schemas]]
database = "prod"
name = "reporting"
all = true
```

This is useful for schemas that host reference tables replicated everywhere.

## DDL routing

Schema mappings apply to both DDL and DML. Fully-qualified statements such as `CREATE TABLE customer_b.users (...)` use the same shard resolution as regular queries, keeping schema changes aligned across shards.

## Manual routing

If you need to query a specific shard or can't specify the schema name in the query, you can add it to a comment, for example:

```postgresql
/* pgdog_sharding_key: "customer_a" */
SELECT * FROM pg_stat_activity;
```

This will send the query to the shard mapped to the `customer_a` schema.
