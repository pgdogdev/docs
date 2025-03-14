# PgDog features

PgDog contains multiple foundational and unique features which make it a great choice
for modern PostgreSQL deployments.

Most features are configurable and can be toggled and tuned. Experimental features are marked
as such, and users are advised to test them before deploying to production. Most foundational features like
load balancing, healthchecks, and query routing have been battle-tested and work well in production.

## Summary


| Feature | Description |
|---------|-------------|
| [Load balancer](load-balancer.md) | Distribute `SELECT` queries evenly between replicas. |
| [Health checks](healthchecks.md) | Check databases are up and running, and can serve queries. |
| [Transaction mode](transaction-mode.md) | Share PostgreSQL connections between thousands of clients, a necessary feature for production deployments. |
| [Hot reload](../configuration/index.md) | Update configuration at runtime without restarting PgDog. |
| [Sharding](sharding/index.md) | Automatic query routing and logical replication between data nodes to scale PostgreSQL horizontally. |
| [Plugins](plugins/index.md) | Pluggable libraries to add functionality to PgDog at runtime. |
| [Authentication](authentication.md) | Support for various PostgreSQL authentication mechanisms, like `SCRAM-SHA-256`. |
| [Session mode](session-mode.md) | Compatibility mode with direct PostgreSQL connections. |

## OS support

PgDog doesn't use any OS-specific features and should run on all systems supported by the Rust compiler, e.g. Linux (x86 and ARM64), Mac OS, and Windows.
