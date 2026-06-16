---
icon: material/speedometer
---

# Transaction mode

Transaction mode allows PgDog to share just a few of PostgreSQL server connections with thousands of clients. This is required for at-scale production deployments where the number of clients is much higher than the number of available connections to the database.

## How it works

All queries served by PostgreSQL run inside transactions. Transactions can be started manually by executing a `BEGIN` command, or automatically by running individual statements.

PgDog takes advantage of this behavior and can split up transactions inside client connections and send them individually, in order, to the first available PostgreSQL server in the connection pool.

<center>
  <img src="/images/transaction-mode.png" width="85%" alt="Load balancer" />
</center>

In practice, this allows thousands of client connections to re-use just one PostgreSQL server connection. Most pools will have several server connections, so hundreds of thousands of clients can use the pooler to execute queries without exceeding the database connection limit.

## Configuration

Transaction mode is **enabled** by default. This is controllable via configuration, at the global, user and database levels:

=== "Global"
    ```toml title="pgdog.toml"
    [general]
    pooler_mode = "transaction"
    ```
    ```yaml title="Helm chart"
    poolerMode: transaction
    ```
=== "Database"
    ```toml title="pgdog.toml"
    [[databases]]
    name = "prod"
    host = "127.0.0.1"
    pooler_mode = "transaction"
    ```
    ```yaml title="Helm chart"
    databases:
      - name: prod
        host: 127.0.0.1
        poolerMode: transaction
    ```
=== "User"
    ```toml title="users.toml"
    [[users]]
    name = "alice"
    database = "prod"
    pooler_mode = "transaction"
    ```
    ```yaml title="Helm chart"
    users:
      - name: alice
        database: prod
        poolerMode: transaction
    ```

## Session state

Clients can set session-level variables, e.g., by passing them in connection parameters or using the `SET` command. This works fine when connecting to Postgres directly, but transaction poolers share server connections between multiple clients.

To avoid session-level state leaking between clients, PgDog tracks connection parameters for each client and updates connection settings before giving a connection to each client.

This is performed efficiently, and server parameters are updated only if they differ from the ones set on the client.

!!! note "Parsing SET commands"
    PgDog automatically detects `SET` commands and uses the `pg_query` SQL parser to extract the GUC/session variable. This feature is **enabled** by default.
    
    For deployments that don't normally need the parser (i.e. unsharded, read-only or no replicas), PgDog can selectively enable its parser for `SET` commands only. This is very fast
    and shouldn't have a noticeable impact on pooler performance.

### Connection parameters

Most Postgres connection drivers support passing parameters in the connection URL. Using the special `options` setting, each parameter is set using the `-c` flag, for example:

```
postgres://user@host:6432/db?options=-c%20statement_timeout%3D3s
```

This sets the `statement_timeout` setting to `3s` (3 seconds). Each time this client
executes a transaction, the pooler will check the value for `statement_timeout` on the server connection,
and if it differs, issue a command to Postgres to update it:

```postgresql
SET statement_timeout TO '3s';
```

### Latency

PgDog keeps a real-time mapping of servers and their parameters, so checking the current value for any parameter doesn't require the pooler to talk to the database. Additionally, it's typically expected that applications have similar connection parameters, so the pooler won't have to synchronize parameters frequently.

## Advisory locks

Advisory locks are an implementation of distributed locking in PostgreSQL. They are set on the server connection and released when the client removes the lock or disconnects.

For example:

```postgresql
SELECT pg_advisory_lock(1234);
```

In transaction mode, server connections are re-used between clients, so additional care needs to be taken to keep the server connection tied to the client that created the lock.

### Handling advisory locks

PgDog is able to detect advisory lock usage and will pin the server connection to the client connection until one of the following conditions is met:

1. The client releases the lock with `pg_advisory_unlock`
2. The client disconnects

!!! note "Query parser"
    This feature requires the query parser to be enabled, which happens if the deployment is sharded
    or is using the read/write split feature of the [load balancer](load-balancer/index.md).

If your PgDog deployment is unsharded and isn't using the [load balancer](load-balancer/index.md) for read/write separation, this feature is **disabled** by default. To enable it, turn on the query parser with the following setting:

=== "pgdog.toml"
    ```toml
    [general]
    query_parser = "session_control_and_locks"
    ```
=== "Helm chart"
    ```yaml
    queryParser: session_control_and_locks
    ```

This will scan all incoming queries for `pg_advisory_*` functions and selectively enable the query parser to handle them correctly.

### Performance

If multiple clients use advisory locks and don't release them quickly, the effectiveness of transaction pooling will be diminshed because server connections will not be quickly re-used between client transactions.

Generally speaking, Postgres advisory locks should be used inside transactions, (i.e. using `pg_xact_advisory_lock()` function), or by the schema migrations tooling only (e.g. Alembic, Rails migrations, etc.).

## Statement mode

Statement mode is a subset of transaction mode. In statement mode, clients are not allowed to start explicit transactions, i.e. using the `BEGIN` statement. All queries will be sent to the first available connection in the pool.

To use statement mode, you can configure it globally or per user/database, for example:

=== "Global"
    ```toml title="pgdog.toml"
    [general]
    pooler_mode = "statement"
    ```
    ```yaml title="Helm chart"
    poolerMode: statement
    ```
=== "Database"
    ```toml title="pgdog.toml"
    [[databases]]
    name = "prod"
    host = "127.0.0.1"
    pooler_mode = "statement"
    ```
    ```yaml title="Helm chart"
    databases:
      - name: prod
        host: 127.0.0.1
        poolerMode: statement
    ```
=== "User"
    ```toml title="users.toml"
    [[users]]
    name = "alice"
    database = "prod"
    pooler_mode = "statement"
    ```
    ```yaml title="Helm chart"
    users:
      - name: alice
        database: prod
        poolerMode: statement
    ```

Statement mode is useful when you want to avoid holding server connections idle while the client executes long transactions, but it does remove an important feature of Postgres, so additional care needs to be taken on the client to handle concurrent database updates.
