---
icon: material/office-building
---

# PgDog Enterprise

PgDog Enterprise is a version of PgDog that contains additional features for large-scale monitoring and deployment of sharded (and unsharded) PostgreSQL databases.

Unlike PgDog itself, PgDog Enterprise is closed source and available upon the purchase of a license. It comes with a control plane which provides real-time visibility into PgDog's operations and enterprise features and dedicated support from the team that built PgDog.

## Features

| Feature | Description |
|-|-|
| [Control plane](control_plane/index.md) | Synchronize and monitor multiple PgDog processes. |
| [Schema management](schema.md) | Synchronize database schema changes between multiple PgDog nodes. |
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

## Getting PgDog Enterprise

The Enterprise edition is available from two sources:

1. Our Docker repository
2. From source

### Docker repository

!!! note "Enterprise license"
    Before deploying these images to production, make sure you purchased our Enterprise Edition license. You're welcome to use these for evaluation purposes, e.g., demo deployment or in a staging environment.

Both PgDog and the control plane are available as Docker images:

| Application | Repository |
|-|-|
| PgDog | `ghcr.io/pgdogdev/pgdog-enterprise` |
| Control plane | `ghcr.io/pgdogdev/pgdog-enterprise/control` |

If you're using our [Helm chart](../installation.md#kubernetes), you just need to change the `image.repository` and `image.tag` variables, for example:

```yaml
image:
  repository: ghcr.io/pgdogdev/pgdog-enterprise
  tag: v2026-03-19
```

For deploying the [control plane](control_plane/index.md), you have two options:

1. Use our managed deployment ([contact us](https://calendly.com/lev-pgdog/30min))
2. [Self-hosting](control_plane/self-hosting.md)

### From source

If you want to manage all aspects of deploying PgDog Enterprise, [get in touch](https://calendly.com/lev-pgdog/30min) and we'll provide you access to the source code via a GitHub deployment key. You'll receive updates at the same frequency as the Docker repository.

## Roadmap

PgDog Enterprise is new and in active development. A lot of the features we want aren't built yet:

| Feature | Description |
|-|-|
| QoS | Quality of service guarantees, incl. throttling on a per-user/database/query level. |
| AWS RDS integration | Deploy PgDog on top of AWS RDS, without the hassle of Kubernetes or manual configuration. |
| Automatic resharding | Detect hot shards and re-shard data without operator intervention. |
| [Durable two-phase](cross-shard-writes.md) | Rollback / commit abandoned two-phase transactions. |
