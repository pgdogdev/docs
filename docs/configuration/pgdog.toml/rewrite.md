---
icon: material/alpha-r-box-outline
---

# Rewrite engine

The `rewrite` section controls PgDog's automatic SQL rewrites for sharded databases. It affects sharding key updates and multi-tuple inserts. Either one can be toggled separately:

```toml
[rewrite]
enabled = false
shard_key = "error"
split_inserts = "error"
primary_key = "ignore"
```

| Setting | Description | Default |
| --- | --- | --- |
| `enabled` | Enables/disables the query rewrite engine. | `false` |
| `shard_key` | Behavior when an `UPDATE` changes a sharding key: `error` rejects the statement,<br>`rewrite` migrates the row between shards,<br>`ignore` forwards it unchanged. | `"error"` |
| `split_inserts` | Behavior when a sharded table receives a multi-row `INSERT`: `error` rejects the statement, `rewrite` fans the rows out to their shards, `ignore` forwards it unchanged. | `"error"` |
| `primary_key` | Behavior when an `INSERT` is missing a `BIGINT` primary key: `error` rejects the statement,<br>`rewrite` auto-injects `pgdog.unique_id()` for missing keys,<br>`ignore` allows the INSERT without modification. | `"ignore"` |

!!! note "Two-phase commit"
    Consider enabling [two-phase commit](../../features/sharding/2pc.md) when either feature is set to `rewrite`. Without it, rewrites are committed shard-by-shard and can leave partial changes if a transaction fails.

## Runtime overrides

The admin database exposes these toggles via the `SET` command:

```postgresql
SET rewrite_enabled TO true;                -- enable/disable rewrite engine
SET rewrite_shard_key_updates TO rewrite;   -- error | rewrite | ignore
SET rewrite_split_inserts TO rewrite;       -- error | rewrite | ignore
```

The setting changes are applied immediately. These overrides allow canary testing before persisting them in `pgdog.toml`.


### Read more

- [Cross-shard INSERT](../../features/sharding/cross-shard-queries/insert.md#multiple-tuples)
- [Cross-shard UPDATE](../../features/sharding/cross-shard-queries/update.md#sharding-key-updates)
