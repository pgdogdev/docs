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
| `enabled` | Master toggle: when `false`, PgDog parses but never applies rewrite plans. | `false` |
| `shard_key` | Behaviour when an `UPDATE` changes a sharding key: `error` rejects the statement,<br>`rewrite` migrates the row between shards,<br>`ignore` forwards it unchanged. | `"error"` |
| `split_inserts` | Behaviour when a sharded table receives a multi-row `INSERT`: `error` rejects the statement, `rewrite` fans the rows out to their shards, `ignore` forwards it unchanged. | `"error"` |

!!! note "Two-phase commit"
    PgDog recommends enabling [two-phase commit](../../features/sharding/2pc.md) when either policy is set to `rewrite`. Without it, rewrites are committed shard-by-shard and can leave partial changes if a shard fails.

## Runtime overrides

The admin database exposes these toggles via `SET` command:

```postgresql
SET rewrite_enabled TO true;                -- mirrors [rewrite].enabled
SET rewrite_shard_key_updates TO rewrite;   -- error | rewrite | ignore
SET rewrite_split_inserts TO rewrite;       -- error | rewrite | ignore
```

The setting changes are applied immediately. These overrides allow canary testing before persisting them in `pgdog.toml`.

## Limitations

### Sharding key updates

Sharding key rewrites in an `UPDATE` clause have to resolve to a single row. If the sharding key isn't unique or the `WHERE` clause has an incorrect `OR` condition, for example, PgDog will rollback the transaction and raise an error.

For example:

```postgresql
UPDATE users SET id = 5 WHERE admin = true;
```

On a single-shard deployment, this would raise an unique index violation error. On a cross-shard deployment, PgDog rewrite engine will block cross-shard updates that could potentially affect multiple rows.

### Multi-tuple inserts

`INSERT` statements with multiple tuples have to be executed outside of an explicit transaction. PgDog needs to start a cross-shard transaction to safely commit the rows to multiple shards, and an existing transaction will interfere with its internal state.

For example:

```postgresql
BEGIN;
INSERT INTO users VALUES ($1, $2), ($3, $4);
```

This scenario will raise an error (code `25001`).

### Default behavior

Both split inserts and sharding key updates fallback to raising an error if `enabled` is set to `false`.

### Read more

- [Rewrite behavior](../../features/sharding/sharding-functions.md#rewrite-behaviour)
