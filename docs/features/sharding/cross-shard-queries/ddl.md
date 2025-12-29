---
icon: material/table-cog
---

# CREATE, ALTER, DROP

`CREATE`, `ALTER` and `DROP`, also known as **D**ata **D**efinition **L**anguage (DDL), are by design, cross-shard statements. When a client sends over a DDL command, PgDog will send it to all shards in parallel, ensuring the table, index, view and sequence definitions are identical across the database cluster.

## Atomicity

DDL statements should be atomic across all shards. This is to protect against a single shard failure to create a table or index, which could result in an inconsistent schema. PgDog can use [two-phase commit](2pc.md) to ensure this is the case, however that means that all DDL statements must be executed inside a transaction, for example:

```postgresql
BEGIN;
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMIT;
```

## Idempotency

Some statements, like `CREATE INDEX CONCURRENTLY`, cannot run inside transactions. To make sure these are safely executed, you have two options: use [manual routing](manual-routing.md) and execute it on each shard individually, or write idempotent schema migrations, for example:

```postgresql
DROP INDEX IF EXISTS user_id_idx;
CREATE INDEX CONCURRENTLY user_id_idx ON users USING btree(user_id);
```
