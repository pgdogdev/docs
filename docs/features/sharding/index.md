---
icon: material/set-split
---

# Sharding PostgreSQL

Sharding splits up a PostgreSQL database with all its tables and indices between multiple servers. Each machine runs its own, independent PostgreSQL server, while PgDog takes care of routing queries and moving data between databases.

Applications are not be aware of sharding and should continue to work as if they were using regualar Postgres. PgDog's role is to make that possible.

A lot of the features described in this section are stable, tested and are powering large, production databases. Others are still experimental and are marked accordingly. If you have any questions about how sharding works in PgDog, join our [Discord](https://discord.gg/CcBZkjSJdd).

## Intro to sharding

<center>
  <img src="/images/resharding-intro.png" class="theme-aware-image" width="85%" alt="How PgDog sharding works" />
  <p>PgDog's sharding architecture</p>
</center>

If you're not familiar with database sharding fundamentals, take a look at the [sharding basics](basics.md). Even if you're a seasoned database expert, it's good to have a refresher to confirm your understanding matches our implementation.

PgDog is somewhat similar in architecture to Vitess (sharding proxy for MySQL). Everything that has to do with sharding is handled internally and any abstraction that leaks to the client is usually considered a bug. You can report those [here](https://github.com/pgdogdev/pgdog/issues).

## Routing queries

PgDog is a query router. It can extract sharding hints directly from the SQL queries, using its built-in PostgreSQL parser, and send queries to one or more shards. Different types of queries which PgDog can currently handle are listed below:

| Query | Description |
|-|-|
| [**Direct-to-shard queries**](query-routing.md) | Sharding key(s) are extracted directly from the query text and the query is sent to one shard only. |
| [**Cross-shard queries**](cross-shard-queries/index.md) | Queries which don't have a sharding key are sent to all shards, with the results collected and transformed, as if they are coming from one database. |
| [**Manually routed queries**](manual-routing.md) | Queries are routed explicitely using a query comment, or separately with a `SET` command, to a specific shard. |
| [**COPY commands**](cross-shard-queries/copy.md) | Data sent with the `COPY` command is automatically sharded between all databases. |

### Data consistency

To make sure data is atomically written in cross-shard transactions, PgDog supports PostgreSQL's prepared transactions and [two-phase commit](2pc.md).

## Managing data

PgDog implements the logical replication protocol used by PostgreSQL and can move data between databases, while distributing individual rows between shards. This process is called resharding and you can read more about how PgDog implements it [here](resharding/index.md).

### Schema management

PgDog makes sure that the database [schema](schema_management/index.md) is identical on all shards. It also has support for [in-database](sequences.md) and [in-proxy](unique-ids.md) primary key generation, so you can continue to use `BIGINT` (and `INTEGER`) primary keys in sharded PostgreSQL deployments.
