
# Features overview

PgDog contains multiple foundational and unique features which make it a great choice
for modern PostgreSQL deployments.

Most features are configurable and can be toggled on/off and tuned to fit your environment. Experimental features are marked
as such, and users are advised to test them before deploying to production.

Foundational features like load balancing, health checks, and query routing have been battle-tested and work well in production.

## Summary

Short summary of currently implemented features below.

| Feature | Description |
|---------|-------------|
| [Load balancer](load-balancer/index.md) | Distribute `SELECT` queries evenly between replicas. Separate reads from writes, allowing applications to connect to a single endpoint. |
| [Health checks](load-balancer/healthchecks.md) | Check databases are up and running. Broken databases are blocked from serving queries. |
| [Transaction mode](transaction-mode.md) | Multiplex PostgreSQL server connections between thousands of clients. |
| [Hot reload](../configuration/index.md) | Update configuration at runtime without restarting the proxy. |
| [Sharding](sharding/index.md) | Automatic query routing and data migration between nodes to scale PostgreSQL horizontally. Schema management, distributed transactions. |
| [Prepared statements](prepared-statements.md) | Support for Postgres named prepared statements in transaction mode. |
| [Plugins](plugins/index.md) | Pluggable libraries to add functionality to PgDog at runtime, without recompiling code. |
| [Authentication](authentication.md) | Support for various PostgreSQL user authentication mechanisms, like SCRAM. |
| [Session mode](session-mode.md) | Compatibility mode with direct PostgreSQL connections. |
| [Metrics](metrics.md) | Real time reporting, including Prometheus/OpenMetrics and an admin database. |
| [Mirroring](mirroring.md) | Copy queries from one database to another in the background. |
| [Pub/Sub](pub_sub.md) | Support for `LISTEN`/`NOTIFY` in transaction mode. |
| [Encryption](tls.md) | TLS encryption for client and server connections. |

### OS support

PgDog doesn't use any OS-specific features and should run on all systems supported by the Rust compiler, e.g. Linux (x86 and ARM64), Mac OS, and Windows.
