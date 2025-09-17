# Comparison to other poolers

PgDog aims to be the de facto PostgreSQL proxy and pooler. Below is a feature comparison between PgDog and a few popular alternatives.

## Basics

| Feature | PgBouncer | PgCat | PgDog |
|-|-|-|-|
| [Connection pooler](../features/transaction-mode.md) | :material-check-circle-outline: | :material-check-circle-outline: | :material-check-circle-outline: |
| Load balancer | Requires external TCP proxy | :material-check-circle-outline: | :material-check-circle-outline: |
| [Read/write separation](../features/load-balancer/index.md) | No | Basic support | Advanced support handling edge cases |
| [Failover](../features/load-balancer/healthchecks.md) | No | :material-check-circle-outline: | :material-check-circle-outline: |
| [Health checks](../features/load-balancer/healthchecks.md) | No | :material-check-circle-outline:  | :material-check-circle-outline: |
| [Authentication](../features/authentication.md) | :material-check-circle-outline: | `md5`, `plain` | `scram-sha-256`, `md5`, `plain` |
| [Metrics](../features/metrics.md) | Admin database only | OpenMetrics & admin database | OpenMetrics & admin database |
| [Mirroring](../features/mirroring.md) | No | Partial support | :material-check-circle-outline: |
| TLS | :material-check-circle-outline: | :material-check-circle-outline: | :material-check-circle-outline: |
| [Prepared statements](../features/prepared-statements.md) | :material-check-circle-outline: | Partial support | :material-check-circle-outline: |
| [Plugins](../features/plugins/index.md) | No | Hardcoded in core | :material-check-circle-outline: |
| Session evariables in transaction mode | Partial support | Partial support | :material-check-circle-outline: |

## Sharding

[Sharding](../features/sharding/index.md) is not supported in PgBouncer, so it will be excluded from this section.

| Feature | PgCat | PgDog |
|-|-|-|
| [Manual routing](../features/sharding/manual-routing.md) | Only using comments (regex), doesn't work with prepared statements | :material-check-circle-outline: |
| [Automatic routing](../features/sharding/query-routing.md) | No | :material-check-circle-outline: |
| [Primary key generation](../features/sharding/schema_management/primary_keys.md) | No | :material-check-circle-outline: |
| [Cross-shard queries](../features/sharding/cross-shard.md) | No | Partial support |
| [COPY](../features/sharding/copy.md) | No | :material-check-circle-outline: |
| [Postgres-compatible sharding functions](../features/sharding/sharding-functions.md) | No | Same functions as declarative partitioning |
| Two-Phase Commit  | No | :material-check-circle-outline: |
