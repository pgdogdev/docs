---
icon: material/counter
---

# Global sequences

!!! note "New feature"

    This feature is new and experimental. Make sure to test it before deploying to production.

The open source edition of PgDog can generate unique, `BIGINT` primary keys in two ways:

1. [Timestamp-based unique ID](../features/sharding/unique-ids.md)
2. [Sharded sequences](../features/sharding/sequences.md)

However, both methods produce gaps in the numbers, while the [unique ID](../features/sharding/unique-ids.md) generates very large 64-bit numbers, which may not work with all applications, e.g., JavaScript apps that pass identifiers directly.

Global sequences are powered by [Raft](control_plane/ha.md) and are guaranteed to produce sequential integers, starting at 1, just like regular PostgreSQL sequences.

## How it works

This feature requires PgDog to be connected to the [control plane](control_plane/index.md). Once configured, the following functions will begin to work automatically:

| Function              | Description                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `pgdog.nextval(name)` | Return a monotonically increasing integer for the given sequence name. |

=== "Example"

    ```postgresql
    SELECT pgdog.nextval('public_users_id_seq') AS id;
    ```

=== "Output"

    ```
     id
    ----
      1
    (1 row)
    ```

### Usage

The sequence functions can be called in any query, including INSERT, UPDATE, and DELETE statements. The sequence values can also be automatically injected into INSERT queries targeting [omnisharded](../features/sharding/omnishards.md) tables:

=== "pgdog.toml"

    ```toml
    [rewrite]
    primary_key = "rewrite_omni_global"
    ```

=== "Helm chart"

    ```yaml
    rewrite:
      primaryKey: rewrite_omni_global
    ```

The name of the sequence is automatically derived from the table and column names of the table targeted by the INSERT statement. For example, enabling this feature will produce the following rewrite:

=== "Statement"

    ```postgresql
    INSERT INTO tenants (tenant_name) VALUES ($1)
    ```

=== "Rewrite"

    ```postgresql
    INSERT INTO tenants (id, tenant_name) VALUES (pgdog.nextval('tenants_id_seq'), $1)
    ```

### Under the hood

All sequence values are stored in the [Raft](control_plane/ha.md) log, which makes them durable, just like PostgreSQL sequences. For this reason, enabling Raft in the control plane is required for this feature to work.

#### Performance

Due to their distributed and durable nature, global sequences are slower to generate numbers than [Unique ID](../features/sharding/unique-ids.md) and [sharded sequences](../features/sharding/sequences.md), and should be used for infrequent writes into tables that otherwise would not be able to support `BIGINT` numbers.
