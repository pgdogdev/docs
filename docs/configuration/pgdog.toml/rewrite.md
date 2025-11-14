---
icon: material/alpha-r-box-outline
---

# Rewrite

The `rewrite` section controls PgDog's automatic SQL rewrites for sharded clusters. It affects shard-key updates and multi-row INSERT statements, and can be toggled globally or per-policy.

## Options

```toml
[rewrite]
enabled = false
shard_key = "error"
split_inserts = "error"
```

| Field | Description | Default |
| --- | --- | --- |
| `enabled` | Master toggle; when `false`, PgDog parses but never applies rewrite plans. | `false` |
| `shard_key` | Behaviour when an `UPDATE` changes a sharding key.<br>`error` rejects the statement.<br>`rewrite` migrates the row between shards.<br>`ignore` forwards it unchanged. | `"error"` |
| `split_inserts` | Behaviour when a sharded table receives a multi-row `INSERT`.<br>`error` rejects the statement.<br>`rewrite` fans the rows out to their shards.<br>`ignore` forwards it unchanged. | `"error"` |

!!! note "Two-phase commit"
    PgDog recommends enabling [`general.two_phase_commit`](general.md#two_phase_commit) when either policy is set to `rewrite`. Without it, rewrites are committed shard-by-shard and can leave partial changes if a shard fails.

## Runtime overrides

The admin database exposes these toggles via `SET`:

```postgresql
SET rewrite_enabled TO true;                -- mirrors [rewrite].enabled
SET rewrite_shard_key_updates TO rewrite;   -- error | rewrite | ignore
SET rewrite_split_inserts TO rewrite;       -- error | rewrite | ignore
```

Switches apply to subsequent sessions once the cluster reloads configuration. Session-level overrides allow canary testing before persisting them in `pgdog.toml`.

## Limitations

* Shard-key rewrites require the `WHERE` clause to resolve to a single row; otherwise PgDog rolls back and raises `rewrite.shard_key="rewrite" is not yet supported ...`.
* Split INSERT rewrites must run outside explicit transactions so PgDog can orchestrate per-shard `BEGIN`/`COMMIT` cycles. Inside a transaction PgDog returns `25001` and leaves the client transaction intact.
* Both features fall back to `error` semantics while `rewrite.enabled = false` or when PgDog cannot determine a target shard.

See [feature docs](../../features/sharding/sharding-functions.md#rewrite-behaviour) for walkthroughs of these flows.
