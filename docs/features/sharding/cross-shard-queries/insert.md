---
icon: material/table-plus
---

# Cross-shard INSERT

If an `INSERT` statement specifies only one sharding key, it's sent [directly](../query-routing.md#insert) to one of the shards. Otherwise, it becomes a cross-shard `INSERT` statement.

## How it works

Cross-shard `INSERT` statements fall into one of three categories, each one handled differently:

1. `INSERT` targeting [omnisharded tables](#omnisharded-tables)
2. `INSERT` targeting a [sharded table](#sharded-tables), with no sharding key specified
3. `INSERT` with [multiple tuples](#multiple-tuples), each destined for a different shard

By design, applications using PgDog don't need to concern themselves with this and can use the database normally. However, there are some trade-offs when using cross-shard queries, documented below.

## Omnisharded tables

For queries that target [omnisharded](../omnishards.md) tables, the statement is sent to all shards concurrently. This ensures that the data is identical on all shards, for example:

```postgresql
INSERT INTO request_logs
    (client_ip, request_path, response_code, created_at)
VALUES
    ($1, $2, $3, $4)
```

An identical row will be created on each shard. [Direct-to-shard](../query-routing.md#select) queries can then either fetch them directly or join with other sharded or omnisharded tables.

### Consistency

Unless [two-phase commit](../2pc.md) is enabled, inserts into omnisharded tables are not guaranteed to be atomic. It is possible for the statement to succeed on some of the shards and not others. If you don't want to or can't enable 2pc, consider sending cross-shard inserts inside a transaction:

```postgresql
BEGIN;
INSERT INTO request_logs
    (client_ip, request_path, response_code, created_at)
VALUES
    ($1, $2, $3, $4);
-- You will receive an ack or an error from all shards here.
COMMIT;
```

This gives you a much higher chance of recording rows on all shards, since you will know if your statement violated some constraint (e.g., unique index or `NOT NULL` check) before committing the transaction.

### Primary keys

It's common practice to use `BIGSERIAL` columns as primary keys. These are powered by a sequence to ensure non-recurring values are automatically generated for each new row.

Sharded databases can't use sequences directly because they are not aware of other shards and will produce duplicate values across databases. To circumvent this, PgDog provides a way to generate [unique integers](../unique-ids.md) in the proxy using a distributed and shard-aware algorithm.

To use unique IDs as primary keys (or in any other column) in omnisharded tables, you can call the `pgdog.unique_id()` function in the `VALUES` clause. For example:

```postgresql
INSERT INTO ip_logs
    (id, client_ip, created_at)
VALUES
    (pgdog.unique_id(), $1, now());
```

The function is evaluated inside PgDog which places the value it returns directly into the query. This works for all queries, including prepared statements.

Each call to `pgdog.unique_id()` generates a unique value, so it's possible to use it multiple times inside the same query and get different numbers, for example:

=== "Query"
    ```postgresql
    SELECT
        pgdog.unique_id() AS one,
        pgdog.unique_id() AS two;
    ```
=== "Result"
    ```
           one         |        two
    -------------------+-------------------
     12014338348945408 | 12014338348945409
    (1 row)
    ```

This function can be used with any tables, not just omnisharded ones, or independently of any tables at all.

## Sharded tables

`INSERT` statements targeting sharded tables will commonly provide the sharding key. A notable exception to this rule is tables that shard on the primary key, which is often database-generated, e.g., using a sequence.

The simplest way to work around this is to use the `pgdog.unique_id()` function to create a unique identifier on the fly, for example:

```postgresql
INSERT INTO users
    (id, email, created_at)
VALUES
    (pgdog.unique_id(), $1, $2)
RETURNING *;
```

However, if you prefer to use sequences instead, you can rely on [database-generated](../schema_management/primary_keys.md) primary keys.

Statements that don't include the primary key in the `INSERT` tuple will be sent to one of the shards, using the same round robin algorithm used for [omnisharded](#omnisharded-tables) tables. The shard will then generate the primary key value using PgDog's [sharded sequences](../schema_management/primary_keys.md#pgdognext_id_seq).

For example, assuming the table `users` is sharded on the primary key `id`, omitting it from the `INSERT` statement will send it to only one of the shards:

```postgresql
INSERT INTO users (email, created_at) VALUES ($1, $2) RETURNING *;
```

## Multiple tuples

In order to create multiple rows at once, the PostgreSQL query syntax supports sending multiple tuples in one statement. For example:

```postgresql
INSERT INTO users
    (id, email, created_at)
VALUES
    ($1, $2, $3),
    ($4, $5, $6);
```

In sharded databases, however, the individual tuples are likely to belong on different shards. To make this work, PgDog can automatically rewrite the statement and send each tuple to the right shard. Using the example above, the result of that operation produces two single-tuple statements:

=== "Statement 1"
      ```postgresql
      INSERT INTO users
          (id, email, created_at)
      VALUES
          ($1, $2, $3)
      ```
=== "Statement 2"
    ```postgresql
    INSERT INTO users
        (id, email, created_at)
    VALUES
        ($1, $2, $3)
    ```

This works for all queries, including prepared statements. PgDog will rewrite all Postgres protocol messages (e.g., `Bind`, `Describe`, etc.) without the application having to change its queries.

Since this feature has additional overhead by using multiple shards for each query, it is **disabled** by default and can be enabled in [`pgdog.toml`](../../../configuration/pgdog.toml/rewrite.md):

```toml
[rewrite]
enabled = true
split_inserts = "rewrite"
```

### Transaction required

Since multi-tuple inserts will likely write rows to several shards, PgDog requires the application to start a transaction before executing such queries. For example:

```postgresql
BEGIN;
INSERT INTO users (email, created_at) VALUES ($1, $2), ($3, $4);
COMMIT; -- or ROLLBACK;
```

If a transaction isn't started and a multi-tuple statement is sent by the application, PgDog will return an error and abort the request.

Requiring transactions ensures that if one of the `INSERT` statements fails, e.g., because of a unique constraint violation, the transaction can be rolled back, leaving the database in a consistent state.

!!! note "Consistency guarantees"

    Much like [omnisharded](#omnisharded-tables) table inserts, it's best to enable [2pc](../2pc.md) before attempting cross-shard multi-tuple inserts. This feature increases the likelihood that cross-shard transactions are atomic.
