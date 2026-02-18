---
icon: material/multicast
---

# Cross-shard queries overview

If a client can't or doesn't specify a sharding key in the query, PgDog will send that query to all shards in parallel, and combine the results automatically. To the client, this looks like the query was executed by a single database.

<center style="margin-top: 2rem;">
    <img src="/images/cross-shard.png" width="80%" alt="Cross-shard queries" />
</center>

## How it works

PgDog understands the Postgres protocol and query language. It can connect to multiple database servers, send the query to all of them, and collect [`DataRow`](#under-the-hood) messages as they are returned by each connection.

Once all servers finish executing the request, PgDog processes the result, performs any requested sorting, aggregation or row disambiguation, and sends the complete result back to the client, as if all rows came from one database server.

Just like with [direct-to-shard](../query-routing.md) queries, each SQL command is handled differently, as documented below:

- [`SELECT`](select.md)
- [`INSERT`](insert.md)
- [`UPDATE`, `DELETE`](update.md)
- [`CREATE`, `ALTER`, `DROP`](ddl.md) (and other DDL statements)
- [`COPY`](copy.md)


## Under the hood

PgDog implements the PostgreSQL wire protocol, which is well documented and stable. The messages sent by Postgres clients and servers contain all the necessary information about data types, column names and executed statements, which PgDog can use to present multi-database results as a single stream of data.

The following protocol messages are especially relevant:

| Message | Description |
|-|-|
| `DataRow` | Each `DataRow` message contains one tuple, for each row returned by the query. |
| `RowDescription` | This message has the column names and data types returned by the query. |
| `CommandComplete` | Indicates that the query has finished returning results. PgDog uses it to start sorting and aggregation. |

The protocol has two formats for encoding tuples: text and binary. Text format is equivalent to calling the `to_string()` method on native types, while binary encoding sends them in network-byte order. For example:

=== "Data"
    ```postgresql
    SELECT 1::bigint, 2::integer, 'three'::VARCHAR;
    ```
=== "Encoding"
    | Data type | Text | Binary |
    |-|-|-|
    | `BIGINT` | `"1"` | `00 00 00 00 00 00 00 01` |
    | `INTEGER` | `"2"` | `00 00 00 02` |
    | `VARCHAR` | `"three"` | `three` |

Since PgDog needs to process rows before sending them to the client, we implemented parsing both formats for [most data types](select.md#supported-data-types).


## Disabling cross-shard queries

If you don't want PgDog to route cross-shard queries, e.g., because you have a [multitenant](../../multi-tenancy.md) system with no interdependencies, cross-shard queries can be disabled with a configuration setting:

```toml
[general]
cross_shard_disabled = true
```

When this setting is enabled and a query doesn't have a sharding key, instead of executing the query, PgDog will return an error and abort the transaction.

## Read more

{{ next_steps_links([
    ("Sharding functions", "../sharding-functions.md", "Control how rows are distributed across shards."),
    ("Cross-shard SELECT", "select.md", "Query data across all shards with automatic merging."),
    ("Cross-shard INSERT", "insert.md", "Insert rows that get routed to the correct shard."),
    ("Cross-shard UPDATE and DELETE", "update.md", "Modify or remove rows in tables spanning multiple shards."),
    ("DDL, e.g. CREATE TABLE", "ddl.md", "Run schema changes across all shards at once."),
    ("COPY command", "copy.md", "Bulk load data across shards with the COPY protocol."),
]) }}
