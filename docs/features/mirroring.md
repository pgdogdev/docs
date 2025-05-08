# Mirroring

Database mirroring replicates traffic, byte for byte, from one database to another. This allows to test how databases respond to production traffic, without breaking production databases.

### How it works

To use mirroring, first, configure both the mirror and the production database in `pgdog.toml`. Once you have it running, add `mirror_of` to all instances of the mirror database:

```toml
[[databases]]
name = "prod"
host = "10.0.0.1"

[[databases]]
name = "staging_db"
host = "10.0.2.25"
mirror_of = "prod"
```

You can connect to the mirror database like any other. The same connection pool will be used for replicating queries. Production database connection pool will not be affected, since all replication happens in a background, asynchronous task.

Each production client has its own mirror background task, so concurrency scales linearly with the number of clients and executed queries.
