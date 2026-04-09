---
icon: material/function-variant
---

# Schema manager functions

The [schema manager](index.md) uses PL/pgSQL functions to generate shard-aware identifiers and perform other actions inside the database to make sharding work. These functions are documented below.

## Functions

### `pgdog.next_id_seq`

The `pgdog.next_id_seq` function generates a unique, shard-aware `BIGINT` number that can be used as a primary key. It accepts the following arguments:

| Argument | Data type | Description |
|-|-|-|
| `sequence_name` | `regclass` | The sequence used as basis for generating integers. |
| `table_name` | `regclass` | The partitioned by hash table which is required for `satisfies_hash_partition` to extract the hash data type. |

If not specified, `table_name` will default to `'pgdog.validator_bigint'::regclass`, so this function can be used with any Postgres sequence. For [sharded sequences](../sequences.md), a special table is created in the `pgdog_internal` schema for each sharded sequence, to avoid lock contention on a single Postgres catalog entity.

#### Sequence cache

When looking for the next valid number, `next_id_seq` will consume several values from the sequence in a row. By default, each call to `nextval` requires a write to the WAL, which could be a bit slower than optimal. To mitigate this, we automatically increase the sequence's cache size to 100, which is usually enough to generate the next value entirely in memory.

### `pgdog.next_uuid_auto`

The `pgdog.next_uuid_auto` function generates a unique, shard-aware `UUID` value which can be used as a primary key. It accepts no arguments and uses `pgdog.validator_uuid` as basis for calling `satisfies_hash_partition`.

##### Example

=== "Function"
    ```postgresql
    SELECT pgdog.next_uuid_auto();
    ```
=== "Output"
    ```
                next_uuid_auto
    --------------------------------------
     f54c49c1-47f6-4ca1-a108-782286e447c3
    ```

UUID generation is not a big problem for sharded databases, since clients can generate and provide UUIDs as part of a query. PgDog still supports generating shard-aware UUIDs in the database, so this function can be configured as a default instead of `gen_random_uuid()`, for example:

```postgresql
CREATE TABLE measurements (
  id UUID PRIMARY KEY DEFAULT pgdog.next_uuid_auto(),
  value REAL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `pgdog.install_sharded_sequence`

The `pgdog.install_sharded_sequence` function replaces the `DEFAULT` value for a table column with a call to [`pgdog.next_id_seq`](#pgdognext_id_seq). It accepts the following arguments:

| Argument | Data type | Description |
|-|-|-|
| `schema_name` | `text` | The name of the schema where the table resides. This is commonly `public` but can be any other schema. |
| `table_name` | `text` | The name of the table that contains the primary key column. |
| `column_name` | `text` | The name of the primary key column. |
| `lock_timeout` | `text` | Maximum amount of time this function call will be allowed to block other queries from accessing this table while it mutates the schema definition. This is set to `1s` by default. |

Under the hood, this function will create two entities:

1. A regular Postgres sequence (using `CREATE SEQUENCE`)
2. A copy of the table specified in `table_name` in the `pgdog_internal` schema and set that as the `table_name` argument for `pgdog.next_id_seq`

One table and sequence is created per column, so it's possible to install multiple sharded sequences into the same table. Creating separate tables for each sharded sequence prevents lock contention on Postgres catalog entities while generating values.
