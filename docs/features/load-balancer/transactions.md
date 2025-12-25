---
icon: material/swap-horizontal
---

# Transactions

PgDog's load balancer is [transaction-aware](../transaction-mode.md) and will ensure that all statements inside a transaction are sent to the same PostgreSQL connection on just one database.

To make sure all queries inside a transaction succeed, PgDog will route all manually started transactions to the **primary** database.

## How it works

Transactions are started by sending the `BEGIN` command, for example:

```postgresql
BEGIN;
INSERT INTO users (email, created_at) VALUES ($1, NOW()) RETURNING *;
COMMIT;
```

PgDog processes queries immediately upon receiving them, and since transactions can contain multiple statements, it isn't possible to determine whether one of the statements won't write to the database.

Therefore, it is more reliable to send the entire transaction to the primary database.

### Read-only transactions

The PostgreSQL query language allows you to declare a transaction as read-only, which prevents it from writing data to the database. PgDog can take advantage of this property and will send such transactions to a replica database.

Read-only transactions are started with the `BEGIN READ ONLY` command, for example:

```postgresql
BEGIN READ ONLY;
SELECT * FROM users WHERE id = $1;
COMMIT;
```

Read-only transactions are useful when queries need a consistent view of the database. Some Postgres database drivers allow this option to be set in the code, for example:

=== "pgx (go)"
    ```go
    tx, err := conn.BeginTx(ctx, pgx.TxOptions{
        AccessMode: pgx.ReadOnly,
    })
    ```
=== "Sequelize (node)"
    ```javascript
    const tx = await sequelize.transaction({
      readOnly: true,
    });
    ```
=== "SQLAlchemy (python)"
    Add `postgresql_readonly=True` to [execution options](https://docs.sqlalchemy.org/en/20/core/connections.html#sqlalchemy.engine.Engine.execution_options), like so:
    ```python
    engine = create_engine("postgresql://user:pw@pgdog:6432/prod")
              .execution_options(postgresql_readonly=True)
    ```

### Replication lag

While transactions are used to atomically change multiple tables, they can also be used to manually route `SELECT` queries to the primary database. For example:

```postgresql
BEGIN;
SELECT * FROM users WHERE id = $1;
COMMIT;
```

This is useful when the data in the table(s) has been recently updated and you want to avoid errors caused by replication lag. This often manifests as "record not-found"-style errors, for example:

```
ActiveRecord::RecordNotFound (Couldn't find User with 'id'=9999):
```

While sending read queries to the primary adds load, it is often necessary in real-time systems that are not equipped to handle replication delays.
