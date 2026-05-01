---
icon: material/table-key
---
# Replica identity

PostgreSQL [replica identity](https://www.postgresql.org/docs/current/sql-altertable.html#SQL-ALTERTABLE-REPLICA-IDENTITY) controls what the WAL records include in `UPDATE` and `DELETE` entries to identify the affected row. PgDog validates each table's identity mode before resharding begins and handles each mode differently during data movement.

## Identity modes

| Mode | How PgDog identifies rows | Supported |
|---|---|---|
| `DEFAULT` | Primary key columns (requires a primary key to exist) | Yes |
| `INDEX` | Columns of the nominated unique index | Yes |
| `FULL` | All columns of the old row | Yes |
| `NOTHING` | No identity | No |

!!! warning "REPLICA IDENTITY NOTHING"
    Tables with `REPLICA IDENTITY NOTHING` cannot be resharded. `UPDATE` and `DELETE` records carry no identity information, so PgDog cannot apply them to the destination. Set the identity to `DEFAULT`, `INDEX`, or `FULL` before starting resharding.

## DEFAULT and INDEX

`DEFAULT` uses the table's primary key to identify each row. `INDEX` uses the columns of a specific unique index nominated with:

```sql
ALTER TABLE t REPLICA IDENTITY USING INDEX idx;
```

Both modes are efficient and require no additional setup beyond having the primary key or index present on the source. These are the recommended modes for resharding. If a table has neither a primary key nor a suitable unique index, use `FULL`.

!!! warning "DEFAULT without a primary key"
    `REPLICA IDENTITY DEFAULT` on a table with no primary key produces no row identity in WAL records for `UPDATE` and `DELETE`. This is equivalent to `NOTHING` for those statements and is not supported for resharding. Either add a primary key, or switch to `INDEX` or `FULL` mode before starting resharding.

## FULL

`FULL` mode is useful for tables that have no primary key or suitable unique index. The WAL carries the entire old row with each change, and PgDog identifies the affected row by matching all columns of the old tuple against rows on the destination.

### Requirements

Requirements depend on whether the table is sharded or non-sharded (omni).

**Sharded tables** have no additional requirements. PgDog routes each change to the correct destination shard using the old tuple's shard key. If the shard key changes in an `UPDATE`, the delete is applied to the old shard and the insert to the new one.

**Omni (non-sharded) tables** require a qualifying unique index on every destination shard before data movement begins. Non-sharded tables are replicated to every shard, so PgDog uses `ON CONFLICT DO NOTHING` to keep inserts idempotent across all shards. This requires a unique index on the destination table.

PgDog checks every destination shard for a qualifying unique index at startup, before any data moves. If one is missing on any shard, replication is rejected immediately with a clear error message.

#### What qualifies as a unique index

Not every unique index is safe for deduplication. PgDog accepts an index that meets all of these conditions:

- **Standard unique index**: not a partial index (which only covers a subset of rows) and not an expression index (which constrains a computed value rather than a stored column)
- **Fully built**: the index must be complete and active, not mid-creation or mid-drop
- **NULL-safe**: either all indexed columns are `NOT NULL`, or the index was created with `NULLS NOT DISTINCT` (PostgreSQL 15+). Standard unique indexes treat `NULL` as distinct from every other `NULL`, so two rows with a `NULL` key column do not conflict and cannot be deduplicated safely

#### Preparing the destination

Schema sync's [pre-data phase](schema.md#pre-data-phase) creates tables and primary key indexes only. Secondary indexes (including unique ones) are created in the [post-data phase](schema.md#post-data-phase), which runs *after* the bulk copy. This means the unique index will not be present on the destination when `COPY_DATA` starts.

Create it manually on each destination shard before starting `COPY_DATA`:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS my_table_code_idx ON my_schema.my_table (code);
```

The index only needs to exist on the destination shards. The source table is unchanged.

### Performance

`FULL` identity includes every column of the old row in each `UPDATE` and `DELETE` WAL record. For wide tables or tables with frequent writes this increases WAL volume on the source and the amount of data PgDog must compare per change.

Applying a `FULL` identity `UPDATE` or `DELETE` requires locating the affected row by matching all columns against the destination table. Because FULL identity tables typically have no primary key or unique index, this is a sequential scan, visiting every row in the table for each individual replicated change. On large, write-heavy tables this cost accumulates quickly.

Once a suitable unique index is available, switching to `INDEX` mode eliminates both the WAL overhead and the sequential scan:

```sql
ALTER TABLE t REPLICA IDENTITY USING INDEX idx;
```

### Limitations and solutions

| Problem | Solution |
|---|---|
| Omni table has no suitable unique index on a destination shard | Create the index manually on each destination shard before starting `COPY_DATA`. |
| Unique index on a nullable column is rejected | Make the column `NOT NULL`, or create the index with `NULLS NOT DISTINCT` (PostgreSQL 15+). |
| Partial or expression index is rejected | Create a plain unique index on stored columns instead. |
| `FULL` WAL overhead is too high | Switch to `REPLICA IDENTITY USING INDEX idx`, which includes only the nominated index columns in WAL records. |
