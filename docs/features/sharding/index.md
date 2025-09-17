---
icon: material/set-split
---

# Sharding Postgres

Sharding splits a PostgreSQL database and all its tables and indices between multiple machines. Each machine runs its own, independent PostgreSQL server, while PgDog takes care of routing queries and moving data between hosts.

## Intro to sharding

If you're not familiar with database sharding fundamentals, take a look at the [sharding basics](basics.md). Even if you're a seasoned database expert, it's good to have a refresher to confirm your understanding matches with our implementation.

[**→ Sharding basics**](basics.md)

## Routing queries

PgDog is a query router. It can extract sharding hints directly from the SQL using the PostgreSQL parser and send queries to one or more shards.

| Query router feature | Description |
|-|-|
| [**Direct-to-shard queries**](query-routing.md) | Automatic sharding key detection which sends the query to one shard only. |
| [**Cross-shard queries**](cross-shard.md) | Queries that don't have a sharding key are sent to all shards with results collected and transformed, as if they came from one database. |
| [**Manual routing**](manual-routing.md) | Provide the sharding key in a query comment, or separately with a `SET` PostgreSQL command. |
| [**Sharded COPY**](copy.md) | Data sent via `COPY` commands is automatically split between all shards, using the configured [sharding function](sharding-functions.md). |

## Managing data

PgDog implements the logical replication protocol used by Postgres to move data between nodes.

### Data consistency

To make sure data is atomically written in cross-shard transactions, PgDog supports PostgreSQL's prepared transactions and two-phase commit.

[**→ Two-phase commit**](2pc.md)

### Resharding

Resharding takes a database cluster with _N_ shards (where _N_ can be 1, for unsharded databases), and turns it into a cluster with _M_ databases. It uses logical replication to do this without downtime or impacting production operations.

[**→ Resharding**](resharding/index.md)

### Schema management

PgDog makes sure that database schema is identical on all shards. It also has support for in-database primary key generation.

[**→ Schema management**](schema_management/index.md)
