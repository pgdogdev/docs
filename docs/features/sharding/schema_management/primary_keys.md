# Primary keys

Primary keys are columns with a unique index and a not null constraint. Theoretically, any data type can be used as the primary key, but the common ones are `BIGINT` (specified as `BIGSERIAL` for automatic generation) and `UUID`.

In sharded databases, primary keys generated on each shard have to be _globally_ unique: no two shards can contain a row with the same value. To make this easy and avoid using external ID generation services, PgDog provides a few pl/PgSQL functions that can do this automatically from inside Postgres.

!!! note
    Make sure to install and enable the [schema manager](manager.md) before using this functionality.

## How it works

Take the following table as an example:

```postgresql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

If you run this command through PgDog, this table will be created on all shards. Underneath, Postgres expands `BIGSERIAL` to the following code:

```postgresql
BIGINT NOT NULL DEFAULT nextval('users_id_seq'::regclass)
```

The `users_id_seq` is a sequence, automatically created by Postgres, that will be used to generate unique values for inserted rows that don't provide one for the `id` column.

Since each shard has its own sequence, values pulled from it would repeat on all shards, creating duplicate references to different objects in your database. To avoid this, we've written a pl/PgSQL function to replace `nextval` that can generate globally unique values.

### `pgdog.next_id_seq`

The function `pgdog.next_id_seq`, installed by default if you're using our [schema manager](manager.md), accepts a sequence and returns a unique and valid value for each shard it's executed on. For example:

=== "Function"
    ```postgresql
    SELECT pgdog.next_id_seq('users_id_seq'::regclass)
    ```

=== "Output"
    ```
     next_id_seq
    -------------
             13
    ```

The function consumes values from the sequence until it finds one that satisfies the [sharding function](../sharding-functions.md) and the shard number of the current database. To make use of it, set it as the default value for your table's primary key, like so:

```postgresql
ALTER TABLE users
ALTER COLUMN id SET DEFAULT pgdog.next_id_seq('users_id_seq'::regclass);
```

#### Sequence cache

When looking for the next valid number, `next_id_seq` will consume several values from the sequence in a row. By default, each call to `nextval` requires a write to the WAL, which could be a bit slower than optimal. To mitigate this, increase the sequence's cache:

```postgresql
ALTER SEQUENCE users_id_seq CACHE 250;
```

This will keep 250 values of the sequence in memory instead of on disk. If you're deploying a large number of shards, increase the cache size accordingly.

### UUIDs

Since UUIDs are randomly generated, they don't need a sequence to guarantee uniqueness. If you're using UUIDs as sharding keys and don't want to generate them in your application, you can use one of our pl/PgSQL functions to create valid values on each shard in the cluster:

=== "Function"
    ```postgresql
    SELECT pgdog.next_uuid_auto();
    ```
=== "Output"
    ```
                next_uuid_auto
    --------------------------------------
     f54c49c1-47f6-4ca1-a108-782286e447c3
    ```

Just like with `BIGSERIAL`, you can set this function as the default on a column:

```postgresql
ALTER TABLE users
ALTER COLUMN uuid SET DEFAULT pgdog.next_uuid_auto();
```
