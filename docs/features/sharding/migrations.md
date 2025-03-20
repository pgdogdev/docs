# Schema migrations

PgDog expects that all shards have, roughly, the same tables. A notable exception to this rule is partitioned tables,
which can have different data tables on different shards. The parent tables should be present on all shards, however.

If a shard has different tables than another, [automatic](query-routing.md) query routing may no work as expected.

## How it works

PgDog sends DDL queries to all shards concurrently. A DDL query is a statement that mutates the database schema, for example:

```postgresql
CREATE TABLE IF NOT EXISTS "users" (
  "id" BIGINT,
  "email" VARCHAR NOT NULL UNIQUE
)
```

This query will be sent to all shards, creating the table on all hosts.

!!! note
    Currently, PgDog doesn't use
    2-phase commit, so to make sure migrations can be retried safely,
    use idempotent statements, like `IF NOT EXISTS`.

### Migrating a specific shard

If you need to run a migration against a specific shard, use [manual routing](manual-routing.md) and add the shard number
in a query comment.
