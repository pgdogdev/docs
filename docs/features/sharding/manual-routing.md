# Manual routing

In case the sharding key is not obvious or can't be extracted from the query,
PgDog supports explicit sharding directions, provided by the client in a query comment.

## Shard number

Queries that need to be routed to a specific shard can include the shard number in a comment, using a key/value notation. The syntax for this is as follows:

```
/* pgdog_shard: <number> */
```

For example, the following query will be routed to shard `1`:

```postgresql
/* pgdog_shard: 1 */ SELECT * FROM "users" WHERE "email" = $1
```

The comment can appear anywhere in the query, including in the beginning and at the end.

#### Shard numbering scheme

PgDog shards are numbered from 0 to _N_ - 1, where _N_ is the total number of shards. For example, in a 3 shard system, shard `0` is the first shard while shard `2` is the third shard.

### Sharding key

If you don't know the shard number but have a sharding key, e.g., the value of a column used for sharding your database, you can specify it in a comment as well:

```postgresql
/* pgdog_sharding_key: <value> */
```

PgDog will extract this value from the query and apply a [sharding function](sharding-functions.md) to produce the actual shard number. For example, the following query will be routed to the right shard for sharding value `25`:

```postgresql
/* pgdog_sharding_key: 25 */
INSERT INTO "orders" ("payment_id", "product_id")
VALUES ($1, $2) RETURNING *;
```

## Usage in frameworks

Some web frameworks support easily adding comments to queries. For example, if you're using Rails, you can add a sharding hint to your queries like so:

=== "Ruby"
    ```ruby
    User
      .where(email: "test@test.com")
      .annotate("pgdog_shard: 0")
      .to_sql
    ```

=== "Query"
    ```postgresql
    SELECT "users".* FROM "users" WHERE "email" = $1 /* pgdog_shard: 0 */
    ```

Others make it pretty difficult, but still possible. For example, Laravel has a [plugin](https://github.com/spatie/laravel-sql-commenter) to make it work while SQLAlchemy makes you write some [code](https://github.com/sqlalchemy/sqlalchemy/discussions/11115). Django appears to have a [plugin](https://google.github.io/sqlcommenter/python/django/) as well.

For this reason, it's best to try [automatic routing](query-routing.md) first, before attempting manual routing.
