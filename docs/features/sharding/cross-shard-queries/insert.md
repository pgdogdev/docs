---
icon: material/table-plus
---

# Cross-shard INSERT

If an INSERT statement specifies only one sharding key, it's sent [directly](../query-routing.md#insert) to one of the shards. Otherwise, it becomes a cross-shard INSERT statement.

## How it works

Cross-shard INSERT statements fall into one of three categories, each one handled differently:

| Statement | Description |
|-|-|
| [Omnisharded](#omnisharded-insert) table INSERT | Executed concurrently on all shards. |
| [Sharded](#sharded-tables) table INSERT with one tuple | Sent to one of the shards only, depending on [primary key](#primary-key-injection) generation strategy. |
| [Sharded](#sharded-tables) table INSERT with [multiple tuples](#multiple-tuples) | Rewritten into separate statements and sent separately to the matching shards. |

Applications using PgDog don't need to concern themselves with implementation details and can use the database normally. However, there are some trade-offs when using cross-shard queries which are documented below.

## Omnisharded tables INSERT

For queries that target [omnisharded](../omnishards.md) tables, the statement is sent to all shards concurrently. This ensures that the data is identical on all shards. This is common for tables that don't have a sharding key or which contain small amounts of data used in joins, for example:

```postgresql
INSERT INTO cities (id, city_name, country_code, created_at)
VALUES ($1, $2, $3, now())
```

An identical row will be created on all shards. [Direct-to-shard](../query-routing.md#select) queries can then either fetch them directly or join them with other sharded or omnisharded tables.

### Omnisharded consistency

Unless [two-phase commit](../2pc.md) is enabled, inserts into omnisharded tables are not guaranteed to be atomic. It is possible for the statement to succeed on some of the shards and not others. If you don't want to or can't enable 2pc, consider sending cross-shard inserts inside a transaction:

```postgresql
BEGIN;
INSERT INTO cities (id, city_name, country_code, created_at)
VALUES ($1, $2, $3, now())
-- You will receive an ack or an error from all shards here.
COMMIT;
```

This gives you a much higher chance of recording rows on all shards, since you will know if your statement violated some constraint (e.g., unique index or `NOT NULL` check) before committing the transaction.

!!! warning "Two-phase commit"
    Enabling [two-phase commit](../2pc.md) is highly recommended. It's been tested and works well in production.

### Primary keys in omnisharded tables

It is common practice to use `BIGSERIAL` (or `SERIAL`) columns as primary keys. These are powered by a sequence to ensure non-recurring values are automatically generated for each new row.

Sharded databases can't use sequences directly because they are not aware of other shards and will produce duplicate values across databases. To circumvent this, PgDog provides a way to generate [unique integers](../unique-ids.md) in the proxy using a distributed and shard-aware algorithm.

To use unique IDs as primary keys (or in any other column) in omnisharded tables, you can call the `pgdog.unique_id()` function in the `VALUES` clause, for example:

```postgresql
INSERT INTO cities (id, city_name, country_code, created_at)
VALUES (pgdog.unique_id(), $1, $2, now());
```

The function is evaluated inside PgDog which replaces the value it returns directly into the query. This works for all queries, including prepared statements. Each call to `pgdog.unique_id()` generates a unique value, so it's possible to use it multiple times inside the same query and get different numbers, for example:

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

This function can be used with any tables, not just omnisharded ones, or independently of any tables at all. PgDog can also [automatically inject](#primary-key-injection) the function call into INSERT queries, so this feature works with ORMs like ActiveRecord, Prisma, etc., out of the box.

## Sharded tables INSERT

INSERT statements targeting sharded tables will commonly provide the sharding key. A notable exception to this rule is tables that shard on the primary key, which is often database-generated, e.g., using a sequence.

The simplest way to work around this is to use the `pgdog.unique_id()` function to create a unique identifier on the fly, for example:

```postgresql
INSERT INTO users (id, email, created_at)
VALUES (pgdog.unique_id(), $1, $2)
RETURNING *;
```

However, if you prefer to use sequences instead, you can rely on [database-generated](../sequences.md) primary keys. This also requires no modifications to your queries and creates primary key values with smaller gaps.

Statements that don't include the primary key in the `INSERT` tuple will be sent to one of the shards, using the same round robin algorithm used for [omnisharded](#omnisharded-tables) tables. The shard will then generate the primary key value using PgDog's [sharded sequences](../sequences.md).

For example, assuming the table `users` is sharded on the primary key `id`, omitting it from the `INSERT` statement will send it to only one of the shards:

```postgresql
INSERT INTO users (email, created_at) VALUES ($1, $2) RETURNING *;
```

!!! note "Sharded sequences"
    For sharded sequences to work correctly, they have to be installed into the database first.
    Read more about this [here](../sequences.md).

## Primary key generation

It's common for ORMs to not specify the primary key during inserts at all, or use a `DEFAULT` placeholder, for example:

```postgresql
INSERT INTO users (email, created_at) VALUES ($1, $2) RETURNING id;
```

PgDog can automatically inject the `id` column (or any other `PRIMARY KEY` column) into the query generated with its [unique ID](../unique-ids.md) generator by rewriting the query, for example:

```postgresql
INSERT INTO users (id, email, created_at) VALUES (pgdog.unique_id(), $1, $2)
```

This works for regular queries and prepared statements alike and is a great fit for both [omnisharded](#omnisharded-tables-insert) and [sharded](#sharded-tables-insert) tables.

This feature is **disabled** by default and can be enabled in [`pgdog.toml`](../../../configuration/pgdog.toml/rewrite.md):

=== "pgdog.toml"
    ```toml
    [rewrite]
    enabled = true
    primary_key = "rewrite"
    ```
=== "Helm chart"
    ```yaml
    rewrite:
      enabled: true
      primaryKey: rewrite
    ```

### Composite primary keys

!!! warning "Not currently supported"
    Composite primary keys are not currently supported for primary key generation inside PgDog.

Primary key injection only works for `BIGINT` primary key columns. Composite primary keys or other data types are not currently supported, but are on the [roadmap](../../../roadmap.md).

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

=== "pgdog.toml"
    ```toml
    [rewrite]
    enabled = true
    split_inserts = "rewrite"
    ```
=== "Helm chart"
    ```yaml
    rewrite:
      enabled: true
      splitInserts: rewrite
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
