---
icon: material/content-copy
---
# Omnisharded tables

Omnisharded tables are tables that contain the same data on all shards. This is useful for storing relatively static metadata used in joins or data that doesn't fit the sharding schema of the database, e.g., list of countries, global settings, list of blocked IPs, etc.

Other names for these tables include **mirrored tables** and **replicated tables**.

## Configuration

Omnisharded tables are configured in [`pgdog.toml`](../../configuration/pgdog.toml/sharded_tables.md#omnisharded-tables):

```toml
[[omnisharded_tables]]
database = "prod"
tables = [
    "settings",
    "cities",
    "terms_of_service",
    "ip_blocks",
]
```

## Query routing

Omnisharded tables are treated differently by the query router. Write queries are sent to all shards concurrently, while read queries are distributed evenly between shards using round robin.

If the query contains a sharding key, it will be used instead, and omnisharded tables in that query will be ignored.

### Consistency

Writing data to omnisharded tables is atomic if you enable [two-phase commit](2pc.md).

If you can't or choose not to use 2pc, make sure writes to omnisharded tables can be repeated in case of failure. This can be achieved by using unique indexes and `INSERT ... ON CONFLICT ... DO UPDATE` queries.

Since reads from omnisharded tables are routed to individual shards, while a two-phase commit takes place, queries to these tables may return different results for a brief period of time.

### Sticky routing

While most omnisharded tables should be identical on all shards, others could differ in subtle ways.

For example, if you configure system catalogs as omnisharded, e.g. to make Rails or other ORMs work out of the box, round robin query routing will return different results for each query.

When enabled, sticky routing will ensure that queries sent by a client to omnisharded tables will be consistently routed to the same shard, for the duration of the client connection.

To enable it, configure your omnisharded tables as follows:

```toml
[[omnisharded_tables]]
database = "prod"
sticky = true # Enable sticky routing for the following tables.
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

Once configured, commands like `\d`, `\d+` and others sent from `psql` will start to return correct results.
