---
icon: material/content-copy
---

# Omnisharded tables

[Omnisharded](../../features/sharding/omnishards.md) tables are tables that have the same data on all shards. They typically are small and contain metadata, e.g., list of countries, cities, etc., and are used in joins.

PgDog allows to read from these tables directly and load balances traffic evenly across all shards.

## Configuration

By default, all tables unless otherwise configured as [sharded](sharded_tables.md), are considered omnisharded.

### Sticky routing

Sticky routing disables round robin for omnisharded tables and sends the queries touching those tables to the same shard, guaranteeing consistent results for the duration of a client's connection:

=== "pgdog.toml"

    ```toml
    [[omnisharded_tables]]
    database = "prod"
    sticky = true
    tables = [
        "settings",
        "cities",
        "terms_of_service",
        "ip_blocks",
    ]
    ```

=== "Helm chart"

    ```yaml
    omnishardedTables:
      - database: prod
        sticky: true
        tables:
          - settings
          - cities
          - terms_of_service
          - ip_blocks
    ```

All queries referencing only these tables will be sent to one of the shards, using the round robin algorithm. If the query contains a sharding key, it will be used instead and omnisharded tables will be ignored by the query router.

#### Default setting

If you want all your omnisharded tables to use sticky routing, you can enable this in the config like so:

```toml
[general]
omnisharded_sticky = true
```

!!! note "Sticky algorithm"

    Routing stickiness is using a random number generator for each connected client.
    This means different clients will use different shards for the omnisharded table queries, evenly spreading the load across the cluster.

### System catalogs

System tables, like `pg_class`, `pg_database`, and others are expected to be roughly the same on all shards. They may not have the same OIDs for custom data types, but they will for all others.

To make tooling like `psql`, pgAdmin, and others work out of the box, all system catalog tables are automatically omnisharded and sticky.

This can be disabled with configuration:

```toml
[general]
system_catalogs_omnisharded = false
```
