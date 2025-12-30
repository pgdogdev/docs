---
icon: material/table-edit
---

# Cross-shard UPDATE and DELETE

`UPDATE` and `DELETE` statements that provide none or more than one sharding key in the `WHERE` clause are cross-shard and will be sent to all shards concurrently.

For example, assuming the `users` table is sharded on the `id` column, filtering rows by any other column produces a cross-shard query:

```postgresql
UPDATE users SET is_admin = true WHERE email LIKE '%@pgdog.dev';
```

## Consistency

Much like cross-shard [`INSERT`](insert.md) statements, any updates to multiple rows on multiple databases outside a [two-phase](../2pc.md) transaction are not guaranteed to be atomic. It's always best to send updates inside a transaction, like so:

```postgresql
BEGIN;
UPDATE orders SET delivered_at = now() WHERE delivered_at IS NULL;
DELETE FROM orders WHERE user_id = $1;
COMMIT;
```

Both `DELETE` and `UPDATE` statements follow the same rules and work largely the same, with the notable exception of sharding key updates.

## Sharding key updates

When the sharding key of a row is updated, its sharded mapping is no longer valid. Queries searching for that row will be sent to the wrong shard, causing data loss. To avoid this, PgDog supports moving the row between shards automatically.

### How it works

Taking the same `users` table as an example (sharded on the `id` column), a statement mutating the sharding key will, frequently, take the following form:

```postgresql
UPDATE users SET id = $1 WHERE id = $2;
```

When a client sends such a statement, PgDog will rewrite it into three statements and execute them automatically:

1. `SELECT` statement to fetch the row from the database
2. `INSERT` statement to create that row on the new shard, with updated values
3. `DELETE` statement to remove the now stale row from the old shard

The entire exchange looks like this:

```postgresql
-- Old `id` value.
SELECT * FROM users WHERE id = $1;

-- New `id` value, with columns retrieved by the previous query.
INSERT INTO users (id, email, created_at)
VALUES ($1, $2, $3);

-- Old `id` value.
DELETE FROM users WHERE id = $1;
```

### Transaction required

Since PgDog needs to execute multiple statements across different databases, a transaction is required to maintain data consistency (as per [MVCC](https://www.postgresql.org/docs/current/mvcc.html)). PgDog expects all sharding key updates to be executed inside a transaction, like so:

```postgresql
BEGIN;
UPDATE users SET id = $1 WHERE id = $2 RETURNING *;
COMMIT;
```

If the application doesn't start a transaction, PgDog will return an error and abort the request.

### Configuration

This feature is **disabled** by default and can be enabled with configuration in [`pgdog.toml`](../../../configuration/pgdog.toml/rewrite.md):

```toml
[rewrite]
enabled = true
shard_key = "rewrite"
```

### Updating multiple rows

While multi-row updates are supported, changing multiple rows' sharding keys is not. If the `UPDATE` statement's `WHERE` clause matches more than one row, PgDog will abort the transaction and return an error.

This check happens early in the transaction and will not create partial updates to the database.

### Efficiency

It's common practice for ORMs, like ActiveRecord or SQLAlchemy, to mutate entire rows when saving records. Take the following example:

=== "ActiveRecord"
    ```ruby
    user = User.find(1)
    user.email = "test@pgdog.dev"
    user.save
    ```
=== "SQL"
    ```postgresql
    UPDATE users SET
        id = $1, email = $2, created_at = $4, updated_at = $3
    WHERE
        id = $1;
    ```

While the sharding key (`id`) is technically updated in the query, its value doesn't change. To avoid unnecessary overhead, PgDog performs multiple checks on the new row before performing the [three statement](#how-it-works) sharding key update flow:

1. If the value of the sharding key parameter (`SET id = $1`) is the same as it is in the `WHERE` clause (`WHERE id = $1`), the query is routed directly to the shard without modifications.
2. If the values are different, or the `WHERE` clause doesn't specify the sharding key, PgDog will check the value of the key returned by the first `SELECT` statement in the flow. If both keys map to the _same_ shard, PgDog will send the query directly to that shard, without modifications.


Updating the sharding key isn't a frequent operation and both of these mechanisms ensure that the more expensive algorithm isn't triggered unnecessarily.
