---
icon: material/table-plus
---

# Cross-shard INSERT

If the `INSERT` statement specifies only one sharding key, it's [routed directly](../query-routing.md#insert) to one of the shards. Otherwise, it becomes a cross-shard `INSERT` statement.

## How it works

Cross-shard `INSERT` statements fall into one of three categories, each one handled differently:

1. `INSERT` targetting [omnisharded tables](#omnisharded-tables)
2. `INSERT` targetting a [sharded table](#sharded-insert), with no sharding key specified
3. `INSERT` with [multiple tuples](#multiple-tuples), each destined for a different shard

By design, applications using PgDog don't need to concern themselves with this and can use the database normally. However, there are some trade-offs when using cross-shard queries, documented below.

## Omnisharded tables

Queries that target [omnisharded](../omnishards.md) tables, the statement is sent to all shards concurrently. This ensures that the data is identical on all shards, for example:

```postgresql
INSERT INTO request_logs
    (client_ip, request_path, response_code, created_at)
VALUES
    ($1, $2, $3, $4)
```

A row will be created on each shard. Each shard can then use joins to fetch this data with [direct-to-shard](../query-routing.md#select) queries.

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

This gives you a much higher chance of recording rows on all shards, since you will know if your statement violated some contstraint (e.g., unique index or `NOT NULL` check) before committing the transaction.

### Primary keys

It's common practice to use `BIGSERIAL` columns as primary keys. These are powered by a sequence to ensure non-recurring values are automatically generated for each new row.

Sharded databases can't use sequences directly because they are not aware of other shards and will produce duplicate values across databases. To circumvent this, PgDog provides a way to generate [unique integers](../unique-ids.md) in the proxy using a distributed and shard-aware algorithm.

To use unique IDs as primary keys (or in any other column) in omnisharded tables, you can call the `pgdog.unique_id()` function in the `VALUES` clause. For example:

```postgresql
INSERT INTO ip_logs
    (id, client_ip, created_at)
VALUES
    (pgdog.unqiue_id(), $1, now());
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

Statements that target sharded tables but don't specify the sharding key are sent to one of the shards only. Which shard receives the statement is controlled by the round robin load balancing algorithm, ensuring all shards serve an equal number of statements.

Finally, if the `INSERT` statement has more than one tuple, the statement is automatically rewritten to create one row at a time, and each row is sent to the matching shard.

## Sharded tables

If the `INSERT` is creating a row in a sharded table, but the primary key is [database-generated](schema_management/primary_keys.md) _and_ used for sharding that table, the statement is sent to only one of the shards, using the round robin algorithm.

For example:

```postgresql
INSERT INTO users (id, email) VALUES (DEFAULT, 'test@acme.com') RETURNING *;
```

Instead of creating one user per shard, which would cause duplicate entries, PgDog will let the database generate a _globally_ unique primary key and place it on one of the shards only. This ensures even data distribution across the entire database cluster.

## Multiple tuples
