---
icon: material/office-building
---

# PgDog Enterprise

PgDog Enterprise is a version of PgDog that contains additional features for large-scale monitoring and deployment of sharded (and unsharded) PostgreSQL databases.

Unlike PgDog itself, PgDog Enterprise is closed source and available upon the purchase of a license. It comes with a control plane which provides real-time visibility into PgDog's operations and enterprise features.

## Features

| Feature | Description |
|-|-|
| [Control plane](control_plane/index.md) | Synchronize and monitor multiple PgDog processes. |
| [Active queries](insights/active_queries.md) | Real-time view into queries running through PgDog. |
| [Query plans](insights/query_plans.md) | Root cause slow queries and execution anomalies with real-time Postgres query plans, collected in the background. |
| [Real-time metrics](metrics.md) | All PgDog metrics, delivered with second-precision through a dedicated connection. |
| [Query statistics](insights/statistics.md) | Query execution statistics, like duration, idle-in-transaction time, errors, and more. |

## Demo

You can run a demo version of PgDog Enterprise locally with Docker Compose:

```bash
curl -sSL \
    https://docs.pgdog.dev/examples/control_plane/docker-compose.yaml \
    -o docker-compose.yaml \
    && docker-compose up
```

The demo comes with the control plane, the web UI and PgDog configured as follows:

| Setting | Value |
|-|-|
| Web UI | `http://localhost:8099` |
| Username | `demo@pgdog.dev` |
| Password | `demopass` |
| PgDog | `0.0.0.0:6432` |

For questions about the demo, PgDog Enterprise features, or pricing, [contact us](https://calendly.com/lev-pgdog/30min). PgDog can be deployed on-prem, in your cloud account, or entirely managed by us.

## Roadmap

PgDog Enterprise is new and in active development. A lot of the features we want aren't built yet:

| Feature | Description |
|-|-|
| QoS | Quality of service guarantees, incl. throttling on a per-user/database/query level. |
| AWS RDS integration | Deploy PgDog on top of AWS RDS, without the hassle of Kubernetes or manual configuration. |
| Automatic resharding | Detect hot shards and re-shard data without operator intervention. |
