---
icon: material/knob
---

# Schema manager

PgDog provides several tools for sharded schema management. Currently, most of the functionality is implemented in Postgres with pl/PgSQL functions. To take advantage of it, you need to install these functions into your sharded database.

## Installation

To install schema management functionality into your database, run the following command:

```
pgdog setup --database <name>
```

The `--database` parameter expects the name of the sharded database in [`pgdog.toml`](../../../configuration/pgdog.toml/databases.md#name). This will create the following entities:

| Entity type | Name | Description |
|-|-|-|
| Schema | `pgdog` | The schema which contains functions and tables used for sharding and synchronization. |
| Table | `pgdog.config` | Table with configuration options specific to each shard, e.g., shard number, total number of shards, etc. |
| Function | [`pgdog.next_id_seq`](primary_keys.md#pgdognext_id_seq) | Globally unique ID generation for `BIGINT` columns. |
| Function | [`pgdog.next_uuid_auto`](primary_keys.md#uuids) | Globally unique UUID generation for `UUID` columns. |

!!! note
    PgDog gets all necessary information about shards from its configuration. Unless the configuration files are in `$PWD`, you should pass them as arguments, for example:

    ```
    pgdog \
      --config /path/to/pgdog.toml \
      --users /path/to/users.toml \
      setup \
      --database prod
    ```
