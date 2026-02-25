---
icon: material/database-plus-outline
---

# New databases

PgDog's strategy for resharding Postgres databases is to create a new, independent cluster of machines and move data over to it in real-time. Creating new databases is environment-specific, and PgDog doesn't currently automate this step[^1].

## Requirements

New databases should be **empty**: don't migrate your [table definitions](schema.md) or [data](hash.md). These will be taken care of automatically by PgDog.

### Database users

Since PgDog was built to work in cloud-managed environments, like AWS RDS, it doesn't usually have access to the `pg_shadow` view, which contains password hashes. Therefore, tools like [`pg_dumpall`](https://www.postgresql.org/docs/current/app-pg-dumpall.html) aren't able to operate correctly, and we can't automatically migrate users to the new database.

For this reason, migrating users to the new database cluster is currently **not supported** and is the responsibility of the operator. Make sure to create all the necessary Postgres users and roles before proceeding to [schema synchronization](schema.md).

## Multiple Postgres databases

If you are operating multiple Postgres databases on the same database server, they will need to be resharded separately. Logical replication, which PgDog uses to move data, operates on a single Postgres database level only.

## Next steps

{{ next_steps_links([
    ("Schema sync", "schema.md", "Synchronize schema entities like table and index definitions to the new shards before moving data. This will make sure logical replication works as expected."),
]) }}


[^1]: We are building a control plane for the [Enterprise Edition](../../../enterprise_edition/index.md) which will take care of creating databases, with support for various cloud vendors (e.g., AWS RDS, Azure SQL, etc.).
