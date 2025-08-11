# Migrating to PgDog

PgDog attempts to make the migration from other connection poolers as smooth as possible. That being said, some changes to your infrastructure may be required to benefit from all our features.

## Configuration

PgDog uses the **TOML** configuration language for its [configuration](configuration/index.md) files. If you're coming from PgBouncer, you'll need to rewrite your configs. We separate user [authentication](features/authentication.md) (usernames, passwords) from the main settings, so you'll still be able to encrypt passwords in production.

## Monitoring

PgDog has two ways to get real time statistics about its internal operations:

1. PgBouncer-style [admin database](administration/index.md)
2. Prometheus [metrics](features/metrics.md)

The admin database isn't 100% compatible with PgBouncer. We have additional fields that reflect our added features. That being said, we try to keep naming conventions as similar as possible, so your existing monitoring tools have a high chance of working without modifications.

## Sharding

Sharding is a novel feature not available in other connection poolers. We've added a ["dry run" mode](features/sharding/dry-run.md) to allow you to experiment with it in production, without changing how your databases work.

In dry run mode, PgDog will parse every single query and record the decision of its query router in an admin view. You can see, in real time, how many queries would go to a single shard (vs. cross-shard), by querying that view:

```
SHOW QUERY_CACHE;
```
