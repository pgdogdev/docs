---
icon: material/multicast
---

# Cross-shard queries

If a client can't specify a sharding key, or doesn't specify one in the query, PgDog will send that query to all shards concurrently and combine the results automatically. To the client, this looks like the query was executed by a single database.

<center>
    <img src="/images/cross-shard.png" width="90%" alt="Cross-shard queries" class="theme-aware-image" />
    <p>Cross-shard queries are sent to all shards concurrently.</p>
</center>

While this sounds simple on the surface, the actual implementation is anything but. It's described below, along with edge cases that are not yet supported.

## Cross-shard basics

PgDog understands the Postgres protocol and SQL query language. It can connect to multiple database servers, send the query to all of them, and collect [rows](#under-the-hood) as they are returned by each connection.

Once all servers finish executing the request, PgDog processes the result, performs any requested sorting, aggregation, or row disambiguation, and sends the complete result back to the client, as if all rows came from one database server.

Just like with [direct-to-shard](../query-routing.md) queries, each SQL command is handled differently, as documented below:

| Commands | Summary |
|-|-|
| [SELECT](select.md) | PgDog implements a scatter/gather query engine to fetch rows from multiple shards concurrently. |
| [INSERT](insert.md) | Statements targeting [omnisharded](omnishards.md) tables are sent to all shards concurrently. Sharded tables with automatic [primary key](../unique-ids.md) generation are sent to one shard only. |
| [UPDATE and DELETE](update.md) | Statements are sent to all shards concurrently. Sharding key updates are partially supported. |
| [DDL statements, e.g., CREATE, ALTER, DROP](ddl.md) | DDL is sent to all shards concurrently, to make sure the schema is identical on all shards. |
| [COPY command](copy.md) | Rows sent via COPY are automatically distributed between all shards using the configured [sharding function](../sharding-functions.md). |

### Under the hood

PgDog implements the PostgreSQL wire protocol, which is well documented and stable. The messages sent by Postgres clients and servers contain all the necessary information about data types, column names, and executed statements, which PgDog can use to present multi-database results as a single stream of data.

The following protocol messages are especially relevant:

| Message | Description |
|-|-|
| `DataRow` | Each `DataRow` message contains one tuple for each row returned by the query. |
| `RowDescription` | This message has the column names and data types returned by the query. |
| `CommandComplete` | Indicates that the query has finished returning results. PgDog uses it to start sorting and aggregation. |

The protocol has two formats for encoding tuples: text and binary. Text format is equivalent to calling the `to_string()` method on native types, while binary encoding sends them in network-byte order. For example:

=== "Query"
    ```postgresql
    SELECT 1::bigint, 2::integer, 'three'::VARCHAR;
    ```
=== "Encoding"
    | Data type | Text | Binary |
    |-|-|-|
    | `BIGINT` | `"1"` | `00 00 00 00 00 00 00 01` |
    | `INTEGER` | `"2"` | `00 00 00 02` |
    | `VARCHAR` | `"three"` | `three` |

Since PgDog needs to process rows before sending them to the client, it implements parsing for both formats for most [data types](select.md#supported-data-types).


## Disabling cross-shard queries

If you don't want PgDog to route cross-shard queries, e.g., because you have a [multitenant](../../multi-tenancy.md) system with no interdependencies, cross-shard queries can be disabled with a configuration setting:

=== "pgdog.toml"
    ```toml
    [general]
    cross_shard_disabled = true
    ```
=== "Helm chart"
    ```yaml
    crossShardDisabled: true
    ```

When this setting is enabled and a query doesn't have a sharding key, PgDog will return an error and abort the transaction instead of executing the query.

## Read more

{{ next_steps_links([
    ("SELECT", "select.md", "Scatter/gather queries, sorting, aggregation, and supported SQL features."),
    ("INSERT", "insert.md", "Omnisharded inserts, missing sharding keys, multiple tuples, and unique IDs."),
    ("UPDATE and DELETE", "update.md", "Cross-shard writes, consistency, and sharding key updates."),
    ("DDL", "ddl.md", "Cluster-wide schema changes, atomicity, and idempotent migrations."),
]) }}
