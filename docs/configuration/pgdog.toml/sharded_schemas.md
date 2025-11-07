---
icon: material/set-split
---

# Sharded schemas

Schema-based sharding places data from tables in different Postgres schemas on their own shards.

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

## Default shard

For queries that don't specify a schema or for which a mapping doesn't exist, the default behavior is to send it to all shards. If this is not desirable, you can configure a default shard, like so:

```toml
[[sharded_schemas]]
database = "prod"
shard = 0
```

For example, the following queries will be sent to shard zero:

```postgresql
-- No schema specified.
SELECT * FROM pg_stat_activity;

-- Schema isn't mapped in the config.
SELECT * FROM customer_c.users
WHERE admin = true;
```

## Manual routing

If you need to query a specific shard or can't specify the schema name in the query, you can add it to a comment, for example:

```postgresql
/* pgdog_sharding_key: "customer_a" */
SELECT * FROM pg_stat_activity;
```

This will send the query to the shard mapped to the `customer_a` schema.
