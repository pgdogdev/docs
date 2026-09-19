---
icon: material/alpha-r-box-outline
---

# Rewrite engine

The `[rewrite]` section configures SQL query rewrites performed by PgDog to make sure queries work correctly with sharded databases.

For example:

=== "pgdog.toml"

    ```toml
    [rewrite]
    shard_key = "error"
    split_inserts = "rewrite"
    primary_key = "rewrite_omni"
    non_deterministic_functions = "rewrite"
    ```

=== "Helm chart"

    ```yaml
    rewrite:
      shardKey: error
      splitInserts: rewrite
      primaryKey: rewrite_omni
      nonDeterministicFunctions: rewrite
    ```

### `shard_key`

Behavior when an UPDATE statement changes the sharding key, requiring PgDog to move the row between shards.

| Value     | Behavior                                              |
| --------- | ----------------------------------------------------- |
| `error`   | Reject the statement.                                 |
| `rewrite` | Move the affected rows between shards.                |
| `ignore`  | Forward the statement without a sharding key rewrite. |

Default: **`error`**

### `split_inserts`

Behavior for INSERT statements with multiple tuples executed on sharded tables.

| Value     | Behavior                                                                 |
| --------- | ------------------------------------------------------------------------ |
| `error`   | Reject inserts that require splitting across shards.                     |
| `rewrite` | Split the INSERT and send each group of rows to its corresponding shard. |
| `ignore`  | Forward the statement without splitting it.                              |

Default: **`error`**

!!! note "Two-phase commit"

    Enable [two-phase commit](../../features/sharding/2pc/index.md) when `shard_key` or `split_inserts` is set to `rewrite`. Without it, changes can commit on some shards while a failure on another shard can leave the operation partially applied.

### `primary_key`

Behavior when an INSERT omits a `BIGINT` primary key. The rewrite modes also replace explicit `DEFAULT` values for those columns.

PgDog uses its [schema cache](../../features/sharding/schema_management/cache.md) to identify primary keys.

| Value                 | Behavior                                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ignore`              | Leave primary key generation to PostgreSQL.                                                                                                                     |
| `error`               | Reject an insert that omits a `BIGINT` primary key column.                                                                                                      |
| `rewrite`             | Inject `pgdog.unique_id()` for sharded and omnisharded tables.                                                                                                  |
| `rewrite_omni`        | Inject `pgdog.unique_id()` only for omnisharded tables. Sharded tables rely on database key generation.                                                         |
| `rewrite_omni_global` | Inject `pgdog.nextval()` only for omnisharded tables, using a global sequence instead of a generated unique ID. Sharded tables rely on database key generation. |

!!! note "Enterprise edition"

    `rewrite_omni_global` requires a connection to the [Enterprise Edition control plane](../../enterprise_edition/control_plane/index.md), which provides the global sequence values.

Default: **`ignore`**

### `non_deterministic_functions`

Configuring `non_deterministic_functions` to `rewrite` will add or mutate INSERT statements that use date/time and UUID columns, to ensure the generated values are consistent on all shards.

The intent is to replicate behavior expected from regular, non-sharded Postgres databases, in a sharded context.

| Data type / function  | Behavior                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `TIMESTAMP`           | Set to transaction time as observed by PgDog, using the connected client's `timezone` parameter. |
| `TIMESTAMPTZ`         | Set to transaction time observed by PgDog, in UTC time.                                          |
| `now()`               | Same as `TIMESTAMPTZ`.                                                                           |
| `current_timestamp()` | Same as `now()` except using statement time, not transaction time.                               |

Default: **`ignore`**

## Runtime overrides

The [admin database](../../administration/index.md) exposes all of these settings through `SET`, e.g.:

```postgresql
SET rewrite_enabled TO true;
SET rewrite_shard_key_updates TO rewrite;
SET rewrite_split_inserts TO rewrite;
SET rewrite_primary_key TO rewrite_omni;
SET rewrite_omni_non_deterministic_functions TO rewrite;
```

Changes take effect immediately and are discarded by configuration reloads.

### Read more

{{ next_steps_links([
    ("Cross-shard INSERT", "../../features/sharding/cross-shard-queries/insert.md#multiple-tuples", "Insert rows with multiple tuples across shards."),
    ("Cross-shard UPDATE", "../../features/sharding/cross-shard-queries/update.md#sharding-key-updates", "Update rows that require sharding key changes."),
    ("Sharded sequences", "../../features/sharding/sequences.md", "Generate primary keys while keeping omnisharded copies consistent."),
]) }}
