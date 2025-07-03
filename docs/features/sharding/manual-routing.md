# Manual routing

In case the sharding key is not configured or can't be extracted from the query,
PgDog supports explicit sharding directions, provided by the client in a query comment.

## Shard number

Queries that need to be routed to a specific shard can include the shard number in a comment, using a key/value notation:

```
/* pgdog_shard: <number> */
```

For example, the following query will be routed to shard `1`:

```postgresql
/* pgdog_shard: 1 */ SELECT * FROM "users" WHERE "email" = $1
```

The comment can appear anywhere in the query, including in the beginning and at the end.

!!! note
    If you are using prepared statements, comments don't work very well. Consider using `SET` instead (see below).

### `SET`

If you're using prepared statements or can't easily annotate your queries with comments, you can set the shard number using the `SET` statement:

```postgresql
BEGIN;
SET pgdog.shard TO 1;
```

This statement must be executed inside a transaction to make sure PgDog routes only that one transaction to the specified shard.

### Shard numbering scheme

PgDog shards are numbered from 0 to _N - 1_, where _N_ is the total number of shards. For example, in a 3-shard system, shard `0` is the first shard while shard `2` is the third shard.

### Sharding key

If you don't know the shard number but have a sharding key, e.g., the value of a column used for sharding your database, you can specify it in a query comment:

```postgresql
/* pgdog_sharding_key: <value> */
```

PgDog will extract this value from the query and apply the [sharding function](sharding-functions.md) to produce the actual shard number. For example, the following query will be routed to the right shard for sharding value `25`:

```postgresql
/* pgdog_sharding_key: 25 */
INSERT INTO "orders" ("payment_id", "product_id")
VALUES ($1, $2) RETURNING *;
```

The same can be done using `SET`, inside a transaction:

```postgresql
BEGIN;
SET pgdog.sharding_key TO '25';
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

Others make it more difficult, but still possible. For example, Laravel has a [plugin](https://github.com/spatie/laravel-sql-commenter) to make it work while SQLAlchemy makes you write a bit of [code](https://github.com/sqlalchemy/sqlalchemy/discussions/11115). Django appears to have a [plugin](https://google.github.io/sqlcommenter/python/django/).

While this approach works, it's always best to try [automatic routing](query-routing.md) first. It's more convenient and less error-prone.

### Usage in Rails

We've written a small gem to help manual routing in Rails/ActiveRecord applications. You can install it from [rubygems.org](https://rubygems.org/gems/pgdog):

```
gem install pgdog
```

You can then manually annotate your ActiveRecord calls with the sharding key (or shard number):

```ruby
PgDog.with_sharding_key(1234) do
  Users.where(email: "test@example.com").first
end
```

You can read more about this in [our blog](https://pgdog.dev/blog/sharding-a-real-rails-app).
