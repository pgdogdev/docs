---
icon: material/list-box-outline
---
# Features

PgDog provides foundational and unique features which make it a great choice
for modern PostgreSQL deployments.

All features are configurable to fit your environment and can be toggled on/off. Most features are stable and used in production and at-scale. Some are experimental and users are advised to test them before deploying to production.

## Summary

| Feature | Description |
|---------|-------------|
| [Load balancer](load-balancer/index.md) | Evenly distribute read queries between replicas and send write queries to the primary, allowing applications to connect to a single endpoint. |
| [Health checks](load-balancer/healthchecks.md) | Ensure databases are up and can serve queries. Offline databases are blocked from serving queries. |
| [Transaction mode](transaction-mode.md) | Multiplex few PostgreSQL server connections between thousands of clients. |
| [Hot reload](../configuration/index.md) | Update configuration at runtime without restarting PgDog. |
| [Sharding](sharding/index.md) | Query routing, data migration and schema management to scale PostgreSQL horizontally. |
| [Prepared statements](prepared-statements.md) | Support for Postgres named prepared statements in transaction mode. |
| [Plugins](plugins/index.md) | Pluggable libraries to add functionality to PgDog at runtime, without recompiling code. |
| [Authentication](authentication.md) | Support for various PostgreSQL user authentication mechanisms, like SCRAM. |
| [Session mode](session-mode.md) | Compatibility mode with direct PostgreSQL connections. |
| [Metrics](metrics.md) | Real time reporting, including Prometheus/OpenMetrics and an admin database. |
| [Mirroring](mirroring.md) | Copy queries from one database to another in the background. |
| [Pub/Sub](pub_sub.md) | Support for `LISTEN`/`NOTIFY` in transaction mode. |
| [Encryption](tls.md) | TLS encryption for client and server connections. |

#### Operating system support

PgDog doesn't use any OS-specific features and should run on all systems supported by the Rust compiler, e.g. Linux (x86 and ARM64), Mac OS, and Windows.

We recommend you run PgDog on Linux. A [Docker image](https://github.com/pgdogdev/pgdog/pkgs/container/pgdog) is available in our repository.
