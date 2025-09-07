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

## Query router

Omnisharded tables are treated differently by the query router. Write queries are sent to all shards concurrently, while read queries are distributed evenly between shards using round robin.

If the query contains a sharding key, it will be used instead, and omnisharded tables in that query will be ignored.

### Consistency

Writing data to omnisharded tables is not currently atomic. While we work on adding support for two-phase commit, make sure writes to omni tables can be repeated in case of failure. This can be done with unique indexes and `ON CONFLICT ... DO UPDATE` queries.

Reads from omni tables are routed to individual shards. If you update data in those tables at the same time, `SELECT` queries to these tables may return different results for a brief period of time.
