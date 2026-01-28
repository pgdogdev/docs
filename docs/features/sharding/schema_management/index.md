---
icon: material/database
---
# Schema management overview

Schemas in sharded databases require additional tooling and maintenance to work correctly. Most aspects of this are handled by PgDog automatically and documented below.

## Schema cache

If your database is sharded, PgDog will automatically load the schema from all shards on startup and use it to detect sharded and omnisharded tables.

[**→ Schema cache**](cache.md)

### Schema manager

Tooling and automation for managing tables, indexes, primary keys, and other schema entities.

[**→ Schema manager**](manager.md)

### Migrations

Most applications use deterministic mechanisms for changing the database schema. PgDog sends
DDL statements to all shards concurrently, ensuring table and index definitions are identical on all shards.

[**→ Schema migrations**](migrations.md)

### Primary keys

Primary keys are typically generated automatically by Postgres. We provide pl/PgSQL functions
to make this work in sharded databases as well.

[**→ Primary keys**](primary_keys.md)
