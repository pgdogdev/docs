# Prepared statements

Prepared statements are SQL queries that are sent to the server in advance. They are parsed by the server, avoiding that cost at execution time.
The client can request a statement to be executed by using its name and passing optional parameters.

PgDog supports prepared statements in transaction mode. In session mode, no special handling is required.

## How it works

When the client sends a `Parse` message, PgDog records the query in a global cache. If it's a new query, PgDog creates a new prepared statement
entry and gives it a unique name. The `Parse` message is renamed and sent to the server. This way, multiple clients can send the same prepared
statement through PgDog without causing `"duplicate prepared statement"` errors.

<center>
  <img src="/images/prepared-statements-1.png" width="100%" height="auto" alt="Prepared statements">
</center>

While the global cache helps with statement reuse, each client keeps its own mapping of prepared statement names.
This allows the clients to send `Bind` and `Describe` messages, as if they were using a dedicated server connection.

`Close` messages are ignored and `CloseComplete` is returned to the client. PgDog manages prepared statements
at a global level, so clients can't evict a prepared statement potentially used by another client.

### Simple protocol

While prepared statements are typically sent using the extended protocol (`Parse`, `Bind`, `Describe`), Postgres
supports preparing statements using the `PREPARE` command, and executing them using the `EXECUTE` command.

PgDog supports rewriting these prepared statements to make sure their names are globally unique, just like with the extended
protocol.

For example:

```postgresql
PREPARE test AS SELECT * FROM users;
```

will be rewritten by PgDog to:

```postgresql
PREPARE __pgdog_1 AS SELECT * FROM users;
```

Statements sent over the simple protocol are not checked against the global cache. Each new statement is given a unique
global name. Since this requires PgDog to parse _each_ incoming query, and that's computationally expensive, this feature is diabled
by default.

You can enable it by setting to `prepared_statements` to `"full"`. 

Statements prepared using this method can be executed normally with `Bind` and `Execute` messages. Result data types can be inspected with `Describe`, just
like a regular prepared statement.

