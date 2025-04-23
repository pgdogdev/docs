# Transaction mode

Transaction mode allows PgDog to share just a few PostgreSQL server connections with thousands of clients. This is required for at-scale production deployments where the number of clients is much higher than the number of available Postgres connections.

## How it works

All queries served by PostgreSQL run inside transactions. Transactions can be started manually by executing a `BEGIN` statement. If a transaction is not started manually, each query sent to PostgreSQL is executed inside its own, automatic, transaction.

PgDog takes advantage of this behavior and can separate client transactions inside client connections and send them, individually, to the first available PostgreSQL server in the connection pool.

<center>
  <img src="/images/transaction-mode.png" width="85%" alt="Load balancer" />
</center>

In practice, this allows thousands of client connections to use just one PostgreSQL server connection to execute queries. Most connection pools will have multiple server connections, so hundreds of thousands of clients can connect to PgDog and execute queries over just a handful of PostgreSQL server connections.


### Enabling transaction mode

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

### Session-level state

Clients can set session-level variables, e.g., by passing them in connection parameters or using the `SET` command. This works fine when connecting to Postgres directly, but PgDog shares server
connections between multiple clients. To avoid session-level state leaking between clients, PgDog tracks connection parameters for each client and updates connection settings before
giving a connection to a client.

#### Specifying connection parameters

Most Postgres connection drivers support passing parameters in the connection URL. Using the special `options` setting, each parameter is set using the `-c` flag, for example:

```
postgres://user@host:6432/db?options=-c%20statement_timeout%3D3s
```

This sets the `statement_timeout` setting to `3s` (3 seconds). Each time this client
executes a transaction, PgDog will check the value for `statement_timeout` on the server connection,
and if it differs, issue a command to Postgres to update it, e.g.:

```postgresql
SET statement_timeout TO '3s';
```


#### Tracking `SET` commands

If the client manually changes server settings, i.e., by issuing `SET` commands, the server will send the updated setting
in a `ParameterStatus` message. PgDog will see this message and update client connection parameters accordingly, as to avoid
issuing unnecessary `SET` statements on subsequent transactions.

#### Impact on latency

PgDog keeps a real-time mapping for servers and their parameters, so checking the current value for any parameter doesn't require PgDog to talk to the database. Additionally, it's typically expected that applications have similar connection parameters, so PgDog won't have to synchronize parameters frequently.
