---
icon: material/traffic-light
---

# Quality of service

Postgres lacks the ability to filter or prioritize queries. Any client can run as many queries as they want, potentially blocking others from using the database.

PgDog implements traffic filtering and prioritization at the proxy. By tagging and assigning queries a budget, it can automatically regulate how much of database resources are available to each query, blocking or throttling queries that exceed their allocation.

## How it works

To make QoS work, tag your queries with the appropriate unit name using query comments. For example:

```postgresql
/* pgdog_qos: unit=api.users.read */
SELECT * FROM users WHERE email = $1
```

The query comment must appear at the beginning of the query, must start with the `pgdog_qos: ` tag, and supports the following attributes:

| Attribute | Description | Example |
|-|-|-|
| `unit` | A unique name identifying the type / grouping the query belongs to. | `unit=api.users.create` |

The `unit` attribute is arbitrary and PgDog supports an unlimited amount of unit names. It can identify a type of query (e.g., reads that fetch user information), an API endpoint in the application (e.g., fetch real-time location of IoT devices), or any other arbitrary classification.

### Configuration

QoS is disabled by default and can be enabled in [`pgdog.toml`](../configuration/pgdog.toml/general.md):

=== "pgdog.toml"
    ```toml
    [qos]
    enabled = true
    max_entries = 10_000
    ```
=== "Helm chart"
    ```yaml
    qos:
      enabled: true
      maxEntries: 10000
    ```

| Setting | Description | Example |
|-|-|-|
| `enabled` | Enable/disable QoS. | `true` |
| `max_entries` | Maximum number of units that will be recorded by PgDog. | `10_000` |

Recording more entries only uses more memory and doesn't impact query performance. When an entry exceeds the max, the oldest / least used entry is removed and won't be tracked until a query using that unit is received by PgDog again.

### Admin database

The QoS measurements are viewable in the [admin database](../administration/index.md), by running the `SHOW QOS` command:

=== "Command"
    ```
    SHOW QOS;
    ```
=== "Output"
    ```
          unit       | executed | blocked | failed | total_time | state
    -----------------+----------+---------+--------+------------+-------
     api.users.read  |       79 |       0 |      0 |     23.601 | pass
     api.users.write |       15 |       0 |      0 |      4.502 | pass
    ```

| Column | Description |
|-|-|
| `unit` | The unit name extracted from the `pgdog_qos: unit=...` query comment. |
| `executed` | Total number of queries that completed execution successfully. |
| `blocked` | Total number of queries blocked before reaching the backend. |
| `failed` | Total number of queries that failed or were aborted before producing a response. |
| `total_time` | Cumulative execution time in milliseconds across all queries for this unit. |
| `state` | Administrative state of the unit: `pass` (queries flow normally) or `blocked` (queries are rejected). |

### Control plane

The QoS measurements are uploaded to the [control plane](control_plane/index.md) on a configurable basis, controlled by the `stats_interval` setting:

=== "pgdog.toml"
    ```toml
    [control]
    endpoint = "https://control-plane-endpoint.cloud.pgdog.dev"
    token = "cff57e5c-7c4f-4ca0-b81c-c8ed22cf873d"
    stats_interval = 5_000
    ```
=== "Helm chart"
    ```yaml
    control:
      endpoint: https://control-plane-endpoint.cloud.pgdog.dev
      token: cff57e5c-7c4f-4ca0-b81c-c8ed22cf873d
      statsInterval: 5000
    ```
