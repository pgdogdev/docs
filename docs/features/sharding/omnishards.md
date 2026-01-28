---
icon: material/content-copy
---
# Omnisharded tables

Omnisharded tables are tables that contain the same data on all shards. This is useful for storing relatively static metadata used in joins or data that doesn't fit the sharding schema of the database, e.g., list of countries, global settings, list of blocked IPs, etc.

Other names for these tables include **mirrored tables** and **replicated tables**.

## Configuration

Unless otherwise specified as a [sharded table](../../configuration/pgdog.toml/sharded_tables.md), all tables are omnisharded by default. This makes configuration simpler, and doesn't require explicitly enumerating all tables in `pgdog.toml`. For example:

```toml
[[sharded_tables]]
database = "prod"
column = "user_id"
```

This will configure all tables that have the `user_id` as sharded and all others as omnisharded.

### Query routing

Omnisharded tables are treated differently by the query router. Write queries are sent to all shards concurrently, while read queries are distributed evenly between shards using round robin.

For example, the following `INSERT` query will be sent to all shards concurrently:

```postgresql
INSERT INTO omnisharded_table (id, value) VALUES ($1, $2);
```

All configured shards will receive and store the same row. When reading that row, PgDog will choose one of the shards using the round robin algorithm, to distribute read load evenly.

#### Sharded and omnisharded tables

If a query references both sharded and omnisharded tables, the **sharded** table routing will take priority. Omnisharded tables are assumed to contain the same data on all shards, so joins referencing omnisharded tables will work as expected.

For example, assuming `users` table is sharded on the `id` column and `global_settings` table is omnisharded, the following query will be sent to the shard corresponding to the value of the `users.id` filter:

```postgresql
SELECT * FROM users
INNER JOIN global_settings ON global_settings.active = true
WHERE users.id = $1;
```

### Consistency

Writing data to omnisharded tables is atomic if you enable [two-phase commit](2pc.md).

If you can't or choose not to use 2pc, make sure writes to omnisharded tables can be repeated in case of failure. This can be achieved by using unique indexes and `INSERT ... ON CONFLICT ... DO UPDATE` queries.

Since data in all omnisharded tables is identical, no cross-shard indexes are necessary to achieve data integrity. You can use regular PostgreSQL `UNIQUE` indexes on individual shards.

!!! note "Eventual consistency"
    Reads from omnisharded tables are routed to individual shards using round robin. While a two-phase commit takes place, different transactions may return different results for a brief period of time (usually less than a millisecond).


### Sticky routing

While most omnisharded tables should be identical on all shards, others could differ in subtle ways.

For example, system catalogs (e.g. `pg_database`, `pg_class`, etc.) could have different OIDs for custom data types (e.g. `VECTOR`, `CREATE TYPE`) on different shards. To make Rails and some other ORMs work out of the box, you can enable sticky routing, which disables round robin and sends omnisharded queries to one shard for the duration of a client's connection.

For example:

```toml
[[omnisharded_tables]]
database = "prod"
sticky = true
tables = [
    "pg_class",
    "pg_database"
]
```

You can enable sticky routing for all omnisharded tables in [`pgdog.toml`](../../configuration/pgdog.toml/general.md#omnisharded_sticky):

```toml
[general]
omnisharded_sticky = true
```

The following system catalogs are using sticky routing by default:

```toml
[[omnisharded_tables]]
database = "prod"
sticky = true
tables = [
    "pg_class",
    "pg_attribute",
    "pg_attrdef",
    "pg_index",
    "pg_constraint",
    "pg_namespace",
    "pg_database",
    "pg_tablespace",
    "pg_type",
    "pg_proc",
    "pg_operator",
    "pg_cast",
    "pg_enum",
    "pg_range",
    "pg_authid",
    "pg_am",
]
```

This is configurable with the `system_catalogs_omnisharded` setting in [`pgdog.toml`](../../configuration/pgdog.toml/general.md#system_catalogs_omnisharded):

```toml
[general]
system_catalogs_omnisharded = true
```

If enabled (it is by default), commands like `\d`, `\d+` and others sent from `psql` will start to return correct results.
