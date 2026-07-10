---
icon: material/arrow-expand-all
---

# Autoscaling

Autoscaling automatically adjusts PgDog settings when the number of processes (e.g. pods in Kubernetes) in the same deployment changes. This simplifies configuration: you no longer need to perform manual calculations to resize connection pools.

## Configuration

Autoscaling is **disabled** by default. To enable it, add the following settings to the [control plane](installation.md) Helm [chart](https://github.com/pgdogdev/helm-ee):

=== "Helm chart"
    ```yaml title="values.yaml"
    control:
      config:
        autoscaling:
          pool_size: true
    ```
=== "control.toml"
    ```toml
    [autoscaling]
    pool_size = true
    ```

## How it works

When a PgDog process connects to the [control plane](index.md), the control plane provides it with the total number of processes that are part of the same deployment. PgDog then automatically adjusts its configuration by dividing all pool-related configuration values by that number, for example:

=== "Configuration"
    ```toml title="pgdog.toml"
    [general]
    default_pool_size = 200

    [[databases]]
    name = "prod"
    host = "10.0.0.1"
    min_pool_size = 50
    ```

    ```toml title="users.toml"
    [[users]]
    name = "postgres"
    database = "prod"
    pool_size = 100
    ```

=== "2 processes"
    ```toml title="pgdog.toml"
    [general]
    default_pool_size = 100

    [[databases]]
    name = "prod"
    host = "10.0.0.1"
    min_pool_size = 25
    ```

    ```toml title="users.toml"
    [[users]]
    name = "postgres"
    database = "prod"
    pool_size = 50
    ```

=== "4 processes"
    ```toml title="pgdog.toml"
    [general]
    default_pool_size = 50

    [[databases]]
    name = "prod"
    host = "10.0.0.1"
    min_pool_size = 12
    ```

    ```toml title="users.toml"
    [[users]]
    name = "postgres"
    database = "prod"
    pool_size = 25
    ```

=== "8 processes"
    ```toml title="pgdog.toml"
    [general]
    default_pool_size = 25

    [[databases]]
    name = "prod"
    host = "10.0.0.1"
    min_pool_size = 6
    ```

    ```toml title="users.toml"
    [[users]]
    name = "postgres"
    database = "prod"
    pool_size = 12
    ```

### Supported settings

The following configuration options are supported for pool size autoscaling:

| Section | Configuration |
|-|-|
| [`[general]`](../../configuration/pgdog.toml/general.md) | [`default_pool_size`](../../configuration/pgdog.toml/general.md#default_pool_size) (alias: `max_pool_size`) |
| [`[general]`](../../configuration/pgdog.toml/general.md) | [`min_pool_size`](../../configuration/pgdog.toml/general.md#min_pool_size) |
| [`[[databases]]`](../../configuration/pgdog.toml/databases.md) | [`pool_size`](../../configuration/pgdog.toml/databases.md#pool_size) |
| [`[[databases]]`](../../configuration/pgdog.toml/databases.md) | [`min_pool_size`](../../configuration/pgdog.toml/databases.md#min_pool_size) |
| [`[[users]]`](../../configuration/users.toml/users.md) | [`pool_size`](../../configuration/users.toml/users.md#pool_size) |
| [`[[users]]`](../../configuration/users.toml/users.md) | [`min_pool_size`](../../configuration/users.toml/users.md#min_pool_size) |

## Orchestrator integration

Autoscaling actions are performed entirely using the internal PgDog <-> control plane protocol and, therefore, will work with all orchestrators, including Kubernetes, ECS, and manual deployments.

### Kubernetes

If using autoscaling and deploying PgDog with our [Helm chart](../../installation.md), make sure to set the pool-related settings to reflect the _total_ number of connections. For example, if deploying 3 replicas and the total pool size across the 3 pods is 600 connections, set it accordingly in `values.yaml`:

```yaml title="values.yaml"
defaultPoolSize: 600
replicas: 3

users:
  - name: "postgres"
    database: "prod"
    minPoolSize: 300 # 50% of the pool
```

When PgDog pods are started, they will connect to the control plane and automatically adjust the pool settings to reflect the total number of pods in the deployment:

| Configuration | Value | Autoscaled value |
|-|-|-|
| `defaultPoolSize` | `600` | `200` |
| `minPoolSize` | `300` | `100` |

!!! note "Automatic adjustment"
    The configuration adjustment happens inside the PgDog process. The control plane does not
    mutate the `ConfigMap` resource, so GitOps tools like ArgoCD will not detect this drift
    and continue to operate normally.
