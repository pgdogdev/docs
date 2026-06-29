---
icon: material/transit-connection-variant
---

# Connection pooler

PgDog is first and foremost a connection pooler. It can proxy thousands (even hundreds of thousands) of application connections with only a handful of actual PostgreSQL connections. This feature is essential to large and busy databases. Without connection pooling, it would be very difficult to use Postgres in production.

## PgDog vs. other poolers

The Postgres ecosystem has many other connection poolers, e.g., the ubiquitous PgBouncer, RDS Proxy, and others. So, why build PgDog and what makes it unique?

### Connection state

PgDog can handle `SET` commands and preserve connection state in [transaction mode](../transaction-mode.md). For example, this command works without polluting the connection state for other clients:

```postgresql
SET application_name TO 'sidekiq';
```

PgDog preserves this and other session parameters in transaction mode, allowing multiple applications to use the same connection pool. This increases pool efficiency at the small cost of running a few extra `SET` commands.

Additionally, it's common to use GUC settings to temporarily change connection state, e.g., to work with RLS (row-level security) or to execute long queries without triggering a statement timeout. Applications using PgBouncer need to bypass it and connect to the database directly. With PgDog, it just works.

!!! note "Connection pinning"
    Unlike RDS Proxy, PgDog doesn't pin sessions or have a query length limit that would trigger that behavior.

### Multithreading

PgDog is multithreaded and asynchronous. Under the hood, we use the popular [Tokio](https://tokio.rs) Rust async runtime. This allows PgDog to serve more queries per second on machines with multiple CPUs.

While it's possible to achieve a similar effect with PgBouncer in port reuse mode (i.e., `so_reuseport`), what sets PgDog apart is its ability to reuse the _same_ connection pool to serve more clients inside the same process. This improves pool utilization and allows PgDog to keep the number of connections to PostgreSQL low while serving more queries per second than PgBouncer.

Additionally, PgDog is easier to manage from an infrastructure/DevOps perspective, since a single multithreaded process will emit only one set of [metrics](../metrics.md).

### Pub/sub

If your application uses `LISTEN`/`NOTIFY`, e.g., [DBOS](https://dbos.dev) or another job queue, it would traditionally need to connect to Postgres directly. PgDog implements its own pub/sub queue and sends and receives `LISTEN`/`NOTIFY` messages for clients connected to it.

This allows applications to use `LISTEN`/`NOTIFY` in [transaction mode](../pub_sub.md), just like any other Postgres feature.
