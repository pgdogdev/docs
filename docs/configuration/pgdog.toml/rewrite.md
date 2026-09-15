---
icon: material/alpha-r-box-outline
---

# Rewrite engine

The `rewrite` section controls PgDog's automatic SQL rewrites for sharded databases. It affects sharding key updates and multi-tuple inserts. Either one can be toggled separately:

=== "pgdog.toml"
    ```toml
    [rewrite]
    enabled = false
    shard_key = "error"
    split_inserts = "error"
    primary_key = "ignore"
    omni_non_deterministic_functions = "ignore"
    ```
=== "Helm chart"
    ```yaml
    rewrite:
      enabled: false
      shardKey: "error"
      splitInserts: "error"
      primaryKey: "ignore"
      omniNonDeterministicFUnctions: "ignore"
    ```

| Setting | Description | Default |
| --- | --- | --- |
| `enabled` | Enables/disables the query rewrite engine. | `false` |
| `shard_key` | Behavior when an `UPDATE` changes a sharding key: `error` rejects the statement,<br>`rewrite` migrates the row between shards,<br>`ignore` forwards it unchanged. | `"error"` |
| `split_inserts` | Behavior when a sharded table receives a multi-row `INSERT`: `error` rejects the statement, `rewrite` fans the rows out to their shards, `ignore` forwards it unchanged. | `"error"` |
| `primary_key` | Behavior when an `INSERT` is missing a `BIGINT` primary key: `error` rejects the statement,<br>`rewrite` auto-injects `pgdog.unique_id()` for missing keys,<br>`ignore` allows the INSERT without modification. | `"ignore"` |
| `omni_non_deterministic_functions` | Behavior when an `INSERT` is headed to an omnisharded table using a function (such as date-time functions) that will not be consistent when performing the functions separately on each shard. Thus, it re-writes all such functions before performing the `INSERT` with constant values to maintain consistency. Example: `NOW()` is re-written to `2026-09-15 18:14:09.123456-05` (or whatever the current time is) before performing the individual `INSERT` operations. This applies to both `DEFAULT` table schema and functions called within a VALUES list of an `INSERT`. `ignore` allows the `INSERT` without modification. | `"ignore"` |

!!! note "Two-phase commit"
    Consider enabling [two-phase commit](../../features/sharding/2pc/index.md) when either feature is set to `rewrite`. Without it, rewrites are committed shard-by-shard and can leave partial changes if a transaction fails.

## Runtime overrides

The admin database exposes these toggles via the `SET` command:

```postgresql
SET rewrite_enabled TO true;                -- enable/disable rewrite engine
SET rewrite_shard_key_updates TO rewrite;   -- error | rewrite | ignore
SET rewrite_split_inserts TO rewrite;       -- error | rewrite | ignore
SET rewrite_omni_non_deterministic_functions TO rewrite;       -- error | rewrite | ignore
```

The setting changes are applied immediately. These overrides allow canary testing before persisting them in `pgdog.toml`.


### Read more

{{ next_steps_links([
    ("Cross-shard INSERT", "../../features/sharding/cross-shard-queries/insert.md#multiple-tuples", "Insert rows with multiple tuples across shards."),
    ("Cross-shard UPDATE", "../../features/sharding/cross-shard-queries/update.md#sharding-key-updates", "Update rows that require sharding key changes."),
]) }}
