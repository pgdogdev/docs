---
icon: material/office-building
---

# PgDog Enterprise

PgDog Enterprise is a version of PgDog with additional features for teams running PgDog in production.

It comes with a control plane, real-time visibility into PgDog's operations, and dedicated support from the team that built it. Unlike the open source edition, PgDog Enterprise is closed source and available upon the purchase of a license.

## Features

The following features are available exclusively in the Enterprise edition:

| Feature | Description |
|-|-|
| [Control plane](control_plane/index.md) (beta) | Manage multiple PgDog nodes and deployments. |
| Queries | Monitor queries running through PgDog in real-time. |
| Plans | Request and track Postgres query plans for slow queries. |
| Metrics | Second-precision PgDog and resource usage metrics. |
| [Quality of Service](qos.md) (alpha) | Track and block bad queries automatically. |

## Demo

You can run a demo of PgDog Enterprise locally with Docker Compose:

```bash
curl -sSL \
    https://docs.pgdog.dev/examples/control_plane/docker-compose.yaml \
    -o docker-compose.yaml \
    && docker-compose up
```

The demo comes with the control plane, the web dashboard and PgDog configured as follows:

| Setting | Value |
|-|-|
| Web dashboard | http://localhost:8099 |
| PgDog | postgres://postgres:postgres@0.0.0.0:6432/postgres |

For questions about the demo, PgDog Enterprise features, or pricing, [contact us](https://calendly.com/lev-pgdog/30min). PgDog can be deployed on-prem, in your cloud account, or entirely managed by us.

## Getting PgDog Enterprise

You can obtain the Enterprise edition of PgDog as follows:

1. Our [Docker repository](#docker-repository)
2. From [source](#from-source)

### Docker repository

!!! note "Enterprise license"
    Before deploying these images to production, make sure you purchased our Enterprise Edition license. You're welcome to use these for evaluation purposes, e.g., for an internal demo or in a staging environment.

Both PgDog and the control plane are available as Docker images:

| Application | Repository | Latest tag |
|-|-|-|
| PgDog | `ghcr.io/pgdogdev/pgdog-enterprise` | `{{ enterprise_tag }}` |
| Control plane | `ghcr.io/pgdogdev/pgdog-enterprise/control` | `{{ enterprise_tag }}` |

If you're using our [Helm chart](../installation.md#kubernetes), you just need to change the `image.repository` and `image.tag` variables:

```yaml
image:
  repository: ghcr.io/pgdogdev/pgdog-enterprise
  tag: {{ enterprise_tag }}
```

#### Control plane

The [control plane](control_plane/index.md) comes with its own [Helm chart](control_plane/installation.md). The chart has a few cluster dependencies, which you can check using our installation script:

```bash
curl -fsSL \
  https://raw.githubusercontent.com/pgdogdev/helm-ee/main/install.sh | bash
```

### From source

If you want to manage all aspects of deploying PgDog Enterprise, [get in touch](https://calendly.com/lev-pgdog/30min) and we'll provide you access to the source code via a GitHub deployment key. You'll receive updates at the same frequency as the Docker repository.

## Roadmap

PgDog Enterprise is new and in active development. A lot of the features we want aren't fully built yet:

| Feature | Description |
|-|-|
| [Quality of Service](qos.md) | Quality of service guarantees, incl. throttling on a per-user/database/query level. |
| AWS RDS integration | Deploy PgDog on top of AWS RDS, without the hassle of Kubernetes or manual configuration. |
| Automatic resharding | Detect hot shards and re-shard data without operator intervention. |
