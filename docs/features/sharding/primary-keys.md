# Primary keys

If you're coming from unsharded Postgres, you're probably used to doing something like this:

```postgresql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR,
);
```

`BIGSERIAL` uses a sequence, so it's unique _per-database_, but with multiple shards, this would cause collisions.

PgDog has special Pl/PgSQL functions to handle primary key generation in sharded databases. Instead of using an external service for generating IDs, you can do this:

```postgresql
CREATE TABLE users (
  id BIGINT PRIMARY KEY DEFAULT pgdog.next_id_auto(),
  email VARCHAR
);
```

### How it works

`pgdog.next_id_auto()` also uses a Postgres sequence underneath, but instead of using it as-is, it continues to fetch the next number until it matches the hash for the shard it's running on. This is quick and reliable because sequences are atomic and the sharding function we use is deterministic: it will never collide, as long as its inputs are unique.

This behavior is controlled with data in `pgdog.config` table. Before you use `next_id_auto`, make sure to configure each shard with the total number of shards in the deployment and it's own shard number.

For example, if you have 3 shards, run this on each of the shards, in order:

##### `shard 0`
```postgresql
INSERT INTO pgdog.config (shard, shards)
VALUES (0, 3);
```

##### `shard 1`
```postgresql
INSERT INTO pgdog.config (shard, shards)
VALUES (1, 3);
```

##### `shard 2`
```postgresql
INSERT INTO pgdog.config (shard, shards)
VALUES (2, 3);
```

!!! note
    Shards in PgDog are zero-indexed, unlike Postgres which uses one-indexed entities (things start at 1, not 0).

You can then try the function directly, to get a feel for how it works:

=== "Automatic ID"

    ```postgresql
    SELECT pgdog.next_id_auto()
    ```

=== "Output"

    ```
      next_id_auto
    ---------------
    5
    ```
