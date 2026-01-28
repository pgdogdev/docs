---
icon: material/cached
---

# Schema cache

To be able to automatically detect sharded and omnisharded tables, PgDog fetches the Postgres schema from all shards on startup. The schema is placed into an in-memory cache and contains Postgres schema names, tables and their columns, including data types.

## How it works

The schema cache allows PgDog to detect the column order in certain queries and extract sharding keys automatically. For example, consider the following table and query:

```postgresql
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE
);
```

When an `INSERT` query without explicit column names is executed, PgDog will be able to extract the sharding key using the schema cache:

```postgresql
INSERT INTO users VALUES ($1, $2);
-- $1 is id
-- $2 is email
```

### Omnisharded check

In addition to detecting sharding keys, PgDog uses the schema cache to determine if a table is sharded or omnisharded. If a sharded table is configured using a column name only in [`pgdog.toml`](../../../configuration/pgdog.toml/sharded_tables.md), inspecting its schema is the only way to find if it has the sharding key, for example:

```toml
[[sharded_tables]]
database = "prod"
column = "user_id"
```

When a query comes in that doesn't specify this column, PgDog needs to decide if the table is sharded or omnisharded:

```postgresql
SELECT * FROM users WHERE created_at > NOW() - INTERVAL '1 hour';
```

PgDog will inspect its in-memory schema cache for the `users` table (taking into consideration the `search_path` setting), and if the table contains the `user_id` column, treat it as a [cross-shard `SELECT`](../cross-shard-queries/select.md). Otherwise, it'll assume the table is [omnisharded](../omnishards.md) and send the query to one of the shards only.

### Migrations

If you change your database schema, e.g. add a new table or alter an existing one, make sure to reload the schema cache, so PgDog is able to route queries correctly. To reload the schema cache, just run the [`RELOAD`](../../../administration/index.md) command via the admin database:

```
RELOAD;
```

The cache is reloaded every time PgDog re-creates its connection pools, so executing the `RECONNECT` command or restarting PgDog will have the same effect.
