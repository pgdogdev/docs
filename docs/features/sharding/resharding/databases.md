---
icon: material/database-plus-outline
---

# New databases

PgDog's strategy for resharding Postgres databases is to create a new, independent cluster of machines and move data over to it in real-time. Creating new databases is environment-specific, and PgDog doesn't currently automate this step.

## Requirements

New databases should be **empty**: don't migrate your [table definitions](schema.md) or [data](hash.md). These will be taken care of automatically by PgDog. The following items do need to be created manually, however:

1. Database users
2. Database schemas

### Database users

Since PgDog was built to work in cloud-managed environments, like AWS RDS, we don't usually have access to the `pg_shadow` view, which contains password hashes. Therefore, tools like [`pg_dumpall`](https://www.postgresql.org/docs/current/app-pg-dumpall.html) aren't able to operate and we can't automatically migrate users to the new database.

For this reason, migrating users to the new database cluster is currently **not supported** and is the responsibility of the operator.

Make sure to create all the necessary Postgres users and roles before proceeding to the [next step](schema.md).

### Database schemas

!!! note ":material-account-hard-hat: Work in progress"
    This step will be automated by a future version of PgDog.

Before running the [schema sync](schema.md), make sure to re-create all of your existing schemas on the new databases. You can take advantage of [cross-shard DDL](../cross-shard.md#create-alter-drop) queries to make this easier.

The `public` schema is created by default for all databases, so if you aren't using any additional schemas, you can skip this step.

## Multiple Postgres databases

If you are operating multiple Postgres databases on the same database server, they will need to be resharded separately. Logical replication, which PgDog uses to move data, operates on a single Postgres database level only.

## Next steps

- [Schema sync](schema.md)
