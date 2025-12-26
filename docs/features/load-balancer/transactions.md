---
icon: material/swap-horizontal
---

# Transactions

PgDog's load balancer is [transaction-aware](../transaction-mode.md) and will ensure that all statements inside a transaction are sent to the same PostgreSQL connection on just one database.

To make sure all queries inside a transaction succeed, PgDog will route all manually started transactions to the primary database.

## How it works

Transactions are started by sending the `BEGIN` command, for example:

```postgresql
BEGIN;
INSERT INTO users (email, created_at) VALUES ($1, NOW()) RETURNING *;
COMMIT;
```

PgDog executes queries immediately upon receiving them, and since transactions can contain multiple statements, it isn't possible to determine in advance what the statements will do.

Therefore, it is more reliable to send the entire transaction to the primary, which can handle all types of queries.

### Read-only transactions

The PostgreSQL query language allows you to declare a transaction as read-only. This property prevents it from writing data, even if a database can accept writes.

PgDog takes advantage of this property and will send such transactions to a replica. Read-only transactions are started with the `BEGIN READ ONLY` command, for example:

```postgresql
BEGIN READ ONLY;
SELECT * FROM users WHERE id = $1;
COMMIT;
```

In addition to forcing all statements to a replica, read-only transactions are useful when queries need a consistent view of the database. Most Postgres client drivers allow this option to be set in the code, for example:

=== "pgx (Go)"
    ```go
    tx, err := conn.BeginTx(ctx, pgx.TxOptions{
        AccessMode: pgx.ReadOnly,
    })
    ```
=== "Sequelize (Node)"
    ```javascript
    const tx = await sequelize.transaction({
      readOnly: true,
    });
    ```
=== "SQLAlchemy (Python)"
    ```python
    engine = create_engine("postgresql://user:pw@pgdog:6432/prod")
              .execution_options(postgresql_readonly=True)
    ```

### Replication lag

Since PgDog sends all manual transactions to the primary, they can also be used to send `SELECT` queries to the primary as well.

For example:

```postgresql
BEGIN;
SELECT * FROM users WHERE id = $1;
COMMIT;
```

 This avoids having to write additional code to handle replication lag, which is useful when the data in the table(s) has been recently updated and you want to avoid fetching stale or nonexistent rows.


!!! note "Example"
    If you're using Rails/ActiveRecord, these types of errors sometimes manifest like this:

    ```
    ActiveRecord::RecordNotFound (Couldn't find User with 'id'=9999):
    ```

While sending read queries to the primary adds additional load, it is often necessary in real-time systems that are not equipped to handle replication delays.
