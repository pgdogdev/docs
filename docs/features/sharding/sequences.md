---
icon: material/numeric
---

# Sharded sequences

!!! note "Unique IDs"
    Sharded sequences require a bit more configuration to get working. If you're looking
    for an easy way to generate cross-shard unique 64-bit integers, consider [Unique IDs](unique-ids.md).

!!! note "Experimental feature"
    This feature is new and experimental. Please report any issues you may run into and test it
    before deploying to production.

Sharded sequences are a way to generate monotonically increasing, globally unique 64-bit integers, without large gaps between numbers
or using a timestamp-based approach that produces very large numbers.

They can be used for producing cross-shard unique primary keys in [sharded](query-routing.md#sharding-configuration) tables, directly inside the database.

## How it works

Sharded sequences combine two Postgres primitives:

1. A normal sequence (created with `CREATE SEQUENCE`)
2. A hashing function, `satisfies_hash_partition`, used for number selection

The two are called inside a PL/pgSQL function that fetches numbers from a sequence until `satisfies_hash_partition` returns `true`, for the total number of shards in the cluster and the shard number it's being executed on:

```postgresql
LOOP
  SELECT nextval('normal_seq'::regclass) INTO val;

  IF satisfies_hash_partition(/* ... */, val) THEN
      RETURN val;
  END IF;

END;
```

Since fetching values from a sequence is very quick, we are able to find the correct number without introducing significant latency to row creation. The Postgres hash function is also good at producing uniform outputs, so all shards will have similar, small gaps between generated numbers.

### Configuration

Sharded sequences can only be used to generate primary keys for _sharded_ tables. [Omnisharded](omnishards.md) tables cannot use database sequences since they aren't guaranteed to produce the same number on all shards.

To make sure this constraint is enforced, PgDog can inject [unique IDs](unique-ids.md) into omnisharded-targeted `INSERT` queries only:

=== "pgdog.toml"
    ```toml
    [rewrite]
    primary_key = "rewrite_omni"
    ```
=== "Helm chart"
    ```yaml
    rewrite:
      primaryKey: rewrite_omni
    ```

This configuration setting is required to use sharded sequences, so make sure to set it before proceeding.

### Installation

To install and use sharded sequences, configure [rewrites](#configuration) to target omnisharded tables only, add all the shards to [`pgdog.toml`](../../configuration/pgdog.toml/databases.md) `[[databases]]` section, and run the following [admin database](../../administration/index.md) command:

=== "Admin database"
    ```
    SETUP SCHEMA;
    ```
=== "CLI"
    Since PgDog is also a CLI application, you can run the same command as follows:

    ```
    $ pgdog setup --database <name>
    ```

    | Option | Description |
    |-|-|
    | `database` | Database `name` in `pgdog.toml`. |

This command will perform the following steps:

1. Install the [schema manager](schema_management/index.md) into all database shards along with the necessary PL/pgSQL functions
2. Find all tables that contain `BIGINT PRIMARY KEY` columns (incl. `BIGSERIAL`) and change their default values to call the sharded sequence function

Once done, all subsequent `INSERT` statements that don't specify the primary key will automatically use the sharded sequence for their respective tables, for example:

=== "Queries"
    ```postgresql
    -- Using DEFAULT explicitly.
    INSERT INTO users
      (id, email, tenant_id)
    VALUES
      (DEFAULT, 'admin@example.com', 5) RETURNING id;

    -- Omitting the primary key.
    INSERT INTO users
      (email, tenant_id)
    VALUES
      ('user@example.com', 5) RETURNING id;
    ```
=== "Output"
    ```
     id
    ----
      1
    (1 row)

     id
    ----
      5
    (1 row)
    ```

The returned `id` will be globally unique and monotonically increasing.

### Migrations

The schema manager will only install the sharded sequence in tables currently present in the database. When adding new tables or primary keys, make sure to execute the following PL/pgSQL function
as well:

```postgresql
SELECT pgdog.install_sharded_sequence('schema_name', 'table_name', 'column_name');
```

| Argument | Description |
|-|-|
| Schema name | The name of the schema where the table is being created. This is commonly the `public` schema, but can be any other as well. |
| Table name | The name of the new or existing table with the primary key. |
| Column name | The name of the primary key column. |

##### Example

The entire migration can be executed inside the same transaction:

```postgresql
BEGIN;

CREATE TABLE public.users (
  id BIGINT PRIMARY KEY,
  email VARCHAR NOT NULL,
  created_at TIMESTAMPTZ
);

SELECT pgdog.install_sharded_sequence('public', 'users', 'id');

COMMIT;
```
