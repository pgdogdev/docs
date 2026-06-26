---
icon: material/database-eye
---

# Automatic database discovery

When deployed in front of AWS Aurora databases, PgDog can automatically detect the cluster instances and configure them in `pgdog.toml`. This is useful when Aurora uses replica autoscaling, which can add or remove instances at any time.

## How it works

This feature is **disabled** by default. To enable it, add at least one Aurora host to `pgdog.toml` and enable autodiscovery:

=== "pgdog.toml"
    ```toml
    [[databases]]
    name = "postgres"
    host = "any-instance.account-id.region.rds.amazonaws.com"

    [autodiscovery]
    enabled = true
    ```
=== "Helm chart"
    ```yaml
    databases:
      - name: "postgres"
        host: "any-instance.account-id.region.rds.amazonaws.com"
    autodiscovery:
      enabled: true
    ```

When enabled, PgDog connects to the first available host for each database in the configuration and runs the [`aurora_replica_status()`](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora_replica_status.html) function to get the list of instances in the cluster.

PgDog then replaces all entries in `pgdog.toml` with the discovered hosts and reloads its configuration automatically.

### Autoscaling events

To keep the list of databases in sync with Aurora autoscaling events, PgDog periodically queries the first available host in its config and runs the replica discovery function again.

If the list of databases has changed, PgDog updates its config and reloads it. The interval for this check is configurable:

=== "pgdog.toml"
    ```toml
    [autodiscovery]
    enabled = true
    check_interval = 5_000
    ```

=== "Helm chart"
    ```yaml
    autodiscovery:
      enabled: true
      checkInterval: 5000
    ```

### Filtering databases

When enabled, autodiscovery runs for all databases in `pgdog.toml` by default. If some of your databases are not running on Aurora, or you want autodiscovery on some databases but not others, you can configure which ones it applies to:

=== "pgdog.toml"
    ```toml
    [[databases]]
    name = "postgres"
    host = "any-instance.account-id.region.rds.amazonaws.com"

    [[databases]]
    name = "staging"
    host = "not-aurora.account-id.region.rds.amazonaws.com"
    
    [autodiscovery]
    enabled = true
    
    [[autodiscovery.databases]]
    name = "postgres"
    ```
=== "Helm chart"
    ```yaml
    databases:
      - name: "postgres"
        host: "any-instance.account-id.region.rds.amazonaws.com"
      - name: "staging"
        host: "not-aurora.account-id.region.rds.amazonaws.com"
    autodiscovery:
      enabled: true
      databases:
        - name: "postgres"
    ```

In this example, only the `postgres` database will have autodiscovery enabled.

!!! note "Configuring databases"
    If you specify the `[[autodiscovery.databases]]` config, any database _not_ listed there will
    not have autodiscovery enabled.

### Replicas only

If you're not using the read/write separation (single endpoint) feature of the [load balancer](../features/load-balancer/index.md#single-endpoint), you may want to configure read and write connection pools separately.

To exclude the writer instance from host discovery for a read-only connection pool, set `replicas_only` in the autodiscovery database settings:

=== "pgdog.toml"
    ```toml
    [[autodiscovery.databases]]
    name = "prod_readonly"
    replicas_only = true
    ```

=== "Helm chart"
    ```yaml
    autodiscovery:
      databases:
        - name: "postgres"
          replicasOnly: true
    ```
