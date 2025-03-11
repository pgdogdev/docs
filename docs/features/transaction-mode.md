# Transaction mode

Transaction mode allows PgDog to share just a few PostgreSQL server connections with thousands of clients.

## How it works

All queries served by PostgreSQL run inside transactions. Transactions can be started manually by sending a `BEGIN` query. If a transaction is not started, each query sent to PostgreSQL is executed inside its own, automatic, transaction.

PgDog takes advantage of this behavior and can separate client transactions inside client connections and send them, individually, to the first available PostgreSQL server in its connection pool.

<center>
  <img src="/images/transaction-mode.png" width="65%" alt="Load balancer" />
</center>

In practice, this allows thousands of client connections to use just one PostgreSQL server connection to execute queries. Most connection pools will have multiple server connections, so hundreds of thousands of clients can connect to PgDog and execute queries over just a handful of PostgreSQL server connections.

This feature is essential for busy applications to use PostgreSQL in production.

## Enable transaction mode

Transaction mode is **enabled** by default. This is controllable via configuration, at the global
and user level:

=== "pgdog.toml"
    ```toml
    [general]
    pooler_mode = "transaction"
    ```
=== "users.toml"
    ```toml
    [[users]]
    name = "alice"
    database = "prod"
    pooler_mode = "transaction"
    ```

<!-- ## Session state

!!! note
    This feature is a work in progress.

Since clients in transaction mode reuse PostgreSQL server connections, it's possible for session-level variables and state to leak between clients. PgDog keeps track of connection state modifications and can automatically clean up server connections after a transaction. While this helps prevent session variables leakage between clients, this does have a small performance overhead.

To avoid this, clients using PgDog in transaction mode should avoid the usage of `SET` statements and use `SET LOCAL` inside an explicit transaction instead:

```postgresql
BEGIN;
SET LOCAL statement_timeout = '30s';
SELECT * FROM my_table;
COMMIT;
``` -->
