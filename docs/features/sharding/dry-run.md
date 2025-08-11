# Dry run mode

In dry run mode, PgDog will parse every single query and record the routing decision in the [admin database](../../administration/index.md). If you're experimenting with sharding, this allows you to test the compatibility of your application without resharding data in production.

## How it works

You can enable dry run in the config:

```toml
[general]
dry_run = true
```

PgDog supports hot reload of its configuration files, so you can toggle this setting without restarting the connection pooler. When enabled, PgDog enables its internal query parser (powered by `pg_query`) and attempts to "shard" every single query it receives.

The sharding decision is recorded in memory, while the query is sent to the production database unchanged.

### Querying statistics

The following information is recorded in the admin database when dry run mode is enabled:

1. The query (with placeholders for values)
2. How many times it was sent to a **single shard** (direct-to-shard)
3. How many times it was sent to **all shards** (cross-shard or multi-shard)

You can export these statistics by querying the admin database view:

```
SHOW QUERY_CACHE;
```

### Performance impact

Since parsing queries isn't free, there is a small performance impact when enabling dry run mode. If your clients are using prepared statements, `pg_query` outputs will be cached and the same statements from this or other clients will not be parsed again. The cache is quite fast, so the impact of query parsing is minimal.

If your client is using the simple protocol, i.e., stores parameter values directly in the SQL, PgDog is unable to take advantage of its cache. Each query will have different parameters, and is, effectively, unique. Therefore, the query has to be "normalized" (parameter values replaced with placeholders, e.g., `$1`) before the query router decision can be recorded. This is done automatically and has an additional performance impact.
