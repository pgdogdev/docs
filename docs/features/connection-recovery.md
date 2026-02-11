---
icon: material/connection
---

# Connection recovery

PostgreSQL database connections are expensive to create so PgDog does its best not to close them unless absolutely necessary. In case a client disconnects before fully processing a query response, PgDog will attempt to preserve the connection using several recovery steps.

## Abandoned transactions

If a client disconnects abruptly while inside a transaction, the transaction is considered abandoned and PgDog will automatically execute a `ROLLBACK`, making sure none of its changes are persisted in the database.

This is a common occurrence if there is a bug that causes the application to crash while executing multiple statements inside a manually started transaction, for example:

=== "Rails"
    ```ruby
    ActiveRecord.transaction do
      user = User.find(5)
      # crash happens here.
    end
    ```
=== "SQLAlchemy"
    ```python
    with session.begin():
        user = session.get(User, 5)
        # crash happens here.
    ```
=== "Go"
    ```go
    tx, _ := db.Begin()
    row := tx.QueryRow("SELECT * FROM users WHERE id = $1", 5)
    // crash happens here.
    ```

### Connection storms

By preserving connections, PgDog protects the database against connection storms. Other connection poolers like PgBouncer close server connections without attempting any recovery.

When the application restarts, the pooler must recreate all of these connections at once, causing thousands of server connections to be opened and closed in rapid succession. This leads to unnecessary contention on database resources and can cause 100% CPU spikes on the database.

## Abandoned queries

A client can abruptly disconnect while receiving query response data from the server. This can happen due to out-of-memory errors or hardware failure, for example:

=== "Rails"
    ```ruby
    orders = Order.where(user_id: 5)
           # ^ crash happens inside `pg`,
           # while receiving multiple rows
    ```
=== "SQLAlchemy"
    ```python
    orders = session.execute(
        select(Order).where(Order.user_id == 5)
    ).all()
    # ^ crash happens while receiving multiple rows
    ```
=== "Go"
    ```go
    rows, _ := db.Query("SELECT * FROM orders WHERE user_id = $1", 5)
    for rows.Next() {
        // crash happens here while iterating over rows
    }
    ```

PgDog will detect this and drain server connections, restoring them to their normal state, before returning them back to the connection pool. The drain mechanism works by receiving and discarding `DataRow` messages and sending [`Sync`](https://www.postgresql.org/docs/current/protocol-message-formats.html#PROTOCOL-MESSAGE-FORMATS-SYNC) to the server to resynchronize the extended protocol state.

Just like [abandoned transactions](#abandoned-transactions), this protects PostgreSQL databases from connection storms caused by unreliable clients. If the client was executing a transaction, it will be rolled back as well.

### Configuration

Connection recovery is an optional feature, enabled by default. You can change how it behaves through configuration:

```toml
[general]
connection_recovery = "recover"
```

| Configuration value | Description |
|-|-|
| `recover` | Attempt full connection recovery, including rollback and resynchronization. This is the default. |
| `rollback_only` | Rollback abandoned transactions but drop the connection if a query was abandoned mid-response. |
| `drop` | Disable connection recovery and close the server connection (identical to PgBouncer). |

To make sure abandoned server connections don't block normal operations, PgDog supports a configurable timeout on the recovery operation. If connection recovery doesn't complete in time, the connection will be closed:

```toml
[general]
rollback_timeout = 5_000
```

## Client connections

Just like server connections, PgDog can maintain client connections (application --> PgDog) during incidents. This helps preserve application-side connection pools and avoids re-creating thousands of connections unnecessarily.

While enabled by default, some applications don't behave well when their queries return errors instead of results. Therefore, this feature is configurable and can be disabled:

```toml
[general]
client_connection_recovery = "drop"
```

| Configuration value | Description |
|-|-|
| `recover` | Attempt to maintain client connections open after database-related errors, like `checkout timeout`. |
| `drop` | Disable connection recovery and close the client connection (identical to PgBouncer). |
