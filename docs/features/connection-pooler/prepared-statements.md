---
icon: material/database-search
---
# Prepared statements

Prepared statements are SQL queries that are sent to the server in advance. They are parsed by the server, avoiding that cost at execution time.
The client can request a statement to be executed by using its name and by passing optional parameters.

PgDog supports prepared statements in [transaction mode](transaction-mode.md). In [session mode](session-mode.md), no special handling is required.

## How it works

When the client sends a `Parse` message, PgDog records the query in a global cache. If it's a new query, PgDog creates a new prepared statement
entry and gives it a unique name.

The `Parse` message is then renamed and sent to Postgres. This way, multiple clients can send the same prepared
statement through PgDog without causing `"duplicate prepared statement"` errors.

<center style="margin: 1rem 0">
  <img src="/images/prepared-statements-1.png" class="theme-aware-image" width="95%" height="auto" alt="Prepared statements">
  <p>Prepared statements flow</p>
</center>

While the global cache helps with statement reuse, each client keeps its own mapping of prepared statement names.
This allows the clients to send `Bind` and `Describe` messages, as if they were using a dedicated server connection.

`Close` messages are ignored and `CloseComplete` is returned to the client. PgDog manages prepared statements
at a global level, so clients can't evict a prepared statement potentially used by another client.

## Cache limit

Prepared statements are stored in memory. On machines constrained by RAM, it's reasonable to introduce a limit on how many statements should be stored. This limit is controlled through configuration:

=== "pgdog.toml"
    ```toml
    [general]
    prepared_statements_limit = 500
    ```
=== "Helm chart"
    ```yaml
    preparedStatementsLimit: 500
    ```

This limit is strictly enforced on server connections: if a prepared statement needs to be sent to a server connection and it would exceed this capacity, the _least recently used_ statement will be closed to allow for more space on the connection.

Since clients re-use prepared statements, this limit isn't enforced for clients: they can prepare as many statements as they wish (and you have memory for). Each statement keeps a counter of when it's used by a client. If the counter reaches zero, i.e., all clients either closed it explicitly or disconnected, the statement is removed from the global cache.

## Statement TTL

Postgres builds an execution plan when a statement is prepared and keeps it for the lifetime of the statement. Since PgDog
keeps server connections open for a long time, a plan can stay in use long after the data it was built for has changed.

A TTL makes PgDog close statements on server connections after some time. The next client that uses the statement prepares
it again, and Postgres builds a fresh plan:

```toml
[general]
prepared_statements_ttl = 300_000
prepared_statements_ttl_jitter = 30_000
```

Clients usually prepare their whole statement set at once, so all their statements would expire at the same moment. The
[jitter](../../configuration/pgdog.toml/general.md#prepared_statements_ttl_jitter) spreads the expiration of each statement
randomly around the TTL.

The TTL is enforced per server connection. The global cache and the client statement names are untouched, so clients don't
see any errors or extra work.

By default the TTL is disabled and statements stay prepared for the lifetime of the server connection.

## Tracking used statements

The number of prepared statements and what they are can be tracked by executing this command on the [admin database](../../administration/index.md):

=== "Command"

    ```
    SHOW PREPARED;
    ```
=== "Output"
    ```
       name    |                       statement                       | rewrite | used_by | memory_used
    -----------+-------------------------------------------------------+---------+---------+-------------
     __pgdog_1 | SELECT abalance FROM pgbench_accounts WHERE aid = $1; |         |       4 |         144
    (1 row)
    ```

Additionally, each server connection entry in the admin [`SHOW SERVERS`](../../administration/servers.md) view will report the number of currently prepared statements.

### Metrics

The number of prepared statements in the global cache, and for each connection pool, is reported in OTEL and OpenMetrics [exporters](../metrics.md).

## Simple protocol

While prepared statements are typically sent using the extended protocol (i.e., `Parse`, `Bind`, `Describe` messages), Postgres
supports preparing statements using the `PREPARE` command, and executing them using the `EXECUTE` command.

PgDog supports rewriting these prepared statements to make sure their names are globally unique, just like with the extended
protocol, for example:

=== "Original statement"
    ```postgresql
    PREPARE test AS SELECT * FROM users;
    ```

=== "Rewritten statement"
    ```postgresql
    PREPARE __pgdog_1 AS SELECT * FROM users;
    ```

Statements sent over the simple protocol are not checked against the global cache. Each new statement is given a unique
global name. Since this requires PgDog to parse _each_ incoming query, and that's computationally expensive, this feature is **disabled** by default.

You can enable simple statement rewrites in [`pgdog.toml`](../../configuration/pgdog.toml/general.md#prepared_statements):

=== "pgdog.toml"
    ```toml
    [general]
    prepared_statements = "full"
    ```
=== "Helm chart"
    ```yaml
    preparedStatements: full
    ```

Statements prepared using this method can be executed normally with `Bind` and `Execute` messages. Result data types can be inspected with `Describe`, just
like a regular prepared statement.

!!! warning "Sharding support"
    Currently, `EXECUTE` command for [sharded](../sharding/index.md) prepared statements is not supported. Such commands will be sent to all shards.

## Unnamed statements

Unnamed (aka anonymous) prepared statements are not cached and are sent to Postgres connections as-is.
