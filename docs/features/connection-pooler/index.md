# Connection pooler

PgDog is first and foremost a connection pooler. It can proxy thousands (even hundreds of thousands) of application connections with only a handful of actual PostgreSQL connections. This feature is essential to large and busy databases. Without connection pooling, it would be very difficult to use Postgres in production.

## PgDog vs. other poolers

The Postgres ecosystem has many other connection poolers, e.g., the ubiquitous PgBouncer, RDS Proxy, and others. So, why build PgDog and what makes it unique?

### Session state

PgDog is able to handle `SET` commands and preserves the connection state in [transaction mode](../transaction-mode.md). For example, this command will work without polluting connection state for other clients:

```postgresql
SET application_name TO 'sidekiq';
```

PgDog will preserve this and other session parameters, in transaction mode, allowing multiple applications to use the same connection pool. This increases pool efficiency, at the small cost of running a few extra `SET` commands.

Additionally, it's common to use GUC settings to temporarily change the connection state, e.g., to work with RLS (row-level security) or to execute long queries without triggering a statement timeout. Applications using PgBouncer would need to bypass it and connect to the database directly. With PgDog, it just works.

!!! note "Connection pinning"
    Unlike RDS Proxy, PgDog doesn't pin sessions nor have any query length limit that would trigger that behavior.

### Multithreading

PgDog is multithreaded and asynchronous. Under the hood, we use the popular [Tokio](https://tokio.rs) Rust async runtime. This allows PgDog to serve more queries per second on machines with multiple CPUs.

While it's possible to achieve a similar effect with PgBouncer in port re-use mode (i.e., `so_reuseport`), what sets PgDog apart is its ability to re-use the _same_ connection pool to serve more clients inside the same process. This improves pool utilization and allows PgDog to keep the number of connections to PostgreSQL low, while serving more queries per second than PgBouncer.

Additionally, it's easier to manage from an infrastructure/DevOps perspective, since a single multithreaded process will emit one set of [metrics](../metrics.md).

### Pub/sub

If your application is using `LISTEN`/`NOTIFY`, e.g. [DBOS](https://dbos.dev), or some other job queue, it would traditionally need to connect to Postgres directly. PgDog implements its own pub/sub queue and takes care of sending and receiving messages through `LISTEN`/`NOTIFY` by clients connected to it.

This allows applications to use `LISTEN`/`NOTIFY` in [transaction mode](../pub_sub.md), just like any other Postgres feature.
