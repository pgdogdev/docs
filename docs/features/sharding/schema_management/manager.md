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
| Schema | `pgdog_internal` | The schema which contains copies of sharded tables and their [sharded sequences](../sequences.md). |
| Table | `pgdog.config` | Table with configuration options specific to each shard, e.g., shard number, total number of shards, etc. |
| Function | [`pgdog.next_id_seq`](functions.md#pgdognext_id_seq) | Globally unique, shard-aware, ID generation for `BIGINT` columns. Uses [sharded sequences](../sequences.md). |
| Function | [`pgdog.next_uuid_auto`](functions.md#pgdognext_uuid_auto) | Globally unique, shard-aware UUID generation for `UUID` columns. |
| Function | [`pgdog.install_sharded_sequence`](functions.md#pgdoginstall_sharded_sequence) | PL/pgSQL function used to setup a [sharded sequence](../sequences.md) for a primary key. |

!!! note
    PgDog gets all necessary information about shards from its configuration. Unless the configuration files are in `$PWD`, you should pass them as arguments, for example:

    ```
    pgdog \
      --config /path/to/pgdog.toml \
      --users /path/to/users.toml \
      setup \
      --database prod
    ```
