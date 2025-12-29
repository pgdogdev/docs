---
icon: material/routes
---

# Manual query routing

In case the sharding key is not configured or cannot be extracted from the query,
PgDog supports explicit sharding directions, provided by the client in a query comment or a `SET` statement.

## How it works

Queries can be routed to a shard directly using its number in the configuration. If this information is not available to the client,
the sharding key can be passed in as well, letting PgDog decide where the query should be sent instead.

Two mechanisms are supported for providing these query routing hints: query comments or the `SET` SQL command.

## Query comment

The PostgreSQL query language supports adding inline comments to queries. They are ignored by the parser but can be used by PgDog to communicate routing hints. The following comments are supported:

| Comment | Description | Example |
|-|-|-|
| `pgdog_shard` | Instructs the query router to send this query to the specified shard, as a [direct-to-shard](query-routing.md) query. | ```/* pgdog_shard: 0 */ SELECT * FROM users``` |
| `pgdog_sharding_key` | Gives the sharding key to the query router and lets it decide where the query should be sent. | ```/* pgdog_sharding_key: 1234 */ SELECT * FROM users ``` |
| `pgdog_role` | Instructs the query router to send this query to the primary database. | ```/* pgdog_role: primary */ SELECT * FROM users ``` |

#### Examples

=== "Shard number"
    The following query will be sent to shard number zero:

    ```postgresql
    /* pgdog_shard: 0 */ CREATE INDEX CONCURRENTLY users_id_idx USING btree(id);
    ```
=== "Sharding key"
    This query will be sent to whichever shard maps to the key `"us-east-1"`:

    ```postgresql
    /* pgdog_sharding_key: 'us-east-1' */ SELECT * FROM users WHERE is_admin = true;
    ```
=== "Role"
    This query will be sent to the primary, even if it only reads data:

    ```postgresql
    /* pgdog_role: primary */ SELECT * FROM users LIMIT 1;
    ```

The comment can appear anywhere in the query, as long as it's syntactically valid.

### Limitations

Since parsing comments is not free, this method is best used for infrequent commands, like schema migrations or queries executed manually by an administrator. For faster query routing, consider supplying the sharding key [directly](query-routing.md) in the query.

Additionally, using query comments with a high-cardinality value, like the `pgdog_sharding_key`, may substantially increase the size of the [prepared statements](../prepared-statements.md) cache. To avoid this, consider the [`SET`](#set) command instead.

## SET

The `SET` command comes from the PostgreSQL query language and is used to change database settings at runtime. Since PgDog uses the Postgres parser, it can intercept this command and perform different actions. For providing routing hints to the query router, we reserved two system settings:

| Setting name | Description | Example |
|-|-|-|
| `pgdog.shard` | Equivalent to `pgdog_shard` comment. The transaction will be sent to the indicated shard only. | ```SET pgdog.shard TO 0 ``` |
| `pgdog.sharding_key` | Equivalent to `pgdog_sharding_key` comment. The key will be used by the query router to compute the shard number for the transaction. | ```SET pgdog.sharding_key TO 'us-east-1'``` |

#### Examples

=== "Shard number"
    The following transaction will be sent to shard number zero:

    ```postgresql
    BEGIN;
    SET pgdog.shard TO 0;
    CREATE INDEX users_id_idx USING btree(id);
    COMMIT;
    ```
=== "Sharding key"
    This transaction will be sent to whichever shard maps to the key `"us-east-1"`:

    ```postgresql
    BEGIN;
    SET pgdog.sharding_key TO 'us-east-1';
    SELECT * FROM users WHERE is_admin = true;
    COMMIT;
    ```

### Limitations

Since `SET` changes session variables, we want to avoid leaking this state between transactions. For this reason, routing hints provided using this method are only supported inside transactions. For example:

```postgresql
BEGIN;
SET pgdog.sharding_key TO 'us-east-1';
SELECT * FROM users WHERE is_admin = true;
COMMIT;
```

### Latency

Starting a transaction and sending a `SET` command has implications on overall query latency. The `SET` command used for providing routing hints is not sent to Postgres, so this should somewhat mitigate its impact. However, to remove it entirely, consider using async queries, if supported by your database driver.

Async queries are sent in batches, and the database driver doesn't wait for a response from the first query before sending the following one.

## Usage in ORMs

Some web frameworks support adding comments to queries. For example, if you're using Rails, you can add a sharding hint to `SELECT` queries like so:

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

Others make it more difficult, but still possible. For example, Laravel has a [plugin](https://github.com/spatie/laravel-sql-commenter) to make it work, while SQLAlchemy makes you write a bit of [code](https://github.com/sqlalchemy/sqlalchemy/discussions/11115). Django appears to have a [plugin](https://google.github.io/sqlcommenter/python/django/).


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

## Read more

- [Cross-shard queries](cross-shard-queries/index.md)
- [Sharding functions](sharding-functions.md)
