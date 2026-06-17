# Alerts

Since the control plane has access to real-time PgDog [metrics](metrics.md), it can detect outliers and trigger automatic alerts.

## How it works

The control plane evaluates the metrics it receives from all PgDog instances on a continuous loop. When they exceed pre-configured thresholds, an incident
is created using one of configured integrations.

### Integrations

The following incident management providers are supported:

| Provider | Description |
|-|-|
| [incident.io](https://incident.io/) | The control plane will create an incident with the highest available priority. |

### Configuration

Alerts are **disabled** by default. To enable them, configure a provider's API key and set thresholds for each supported metric you would like to monitor:

```yaml title="values.yaml"
control:
  config:
    alerts:
      evaluation_window_secs: 300
      thresholds:
        clients_waiting: 10
        cpu: 90.0
        memory: 2048
        server_connections: 100
      incident_io:
        api_key: inc_live_xxx
```

#### Parameters

The following parameters are configurable via the [Helm chart](../installation.md):

| Parameter | Description | Unit |
|-|-|-|
| `evaluation_window_secs` | The evaluation window for the metrics. Longer windows reduce the chance of false positives in spiky workloads. Shorter windows are quicker to notify in case of a real issue. | Seconds, e.g., `300` (5 minutes) |
| `thresholds.clients_waiting` | Average number of clients waiting for a connection from a pool. | Clients, e.g., `10` |
| `thresholds.cpu` | CPU utilization of each PgDog pod. | Percentage, e.g., `90.0` (90%) |
| `thresholds.memory` | Memory utilization of each PgDog pod. | MiB, e.g., `2048` (2048 MiB) |
| `thresholds.server_connections` | Number of open connections from PgDog to Postgres. | Connections, e.g., `100` |

!!! note "Disabled by default"
    Thresholds have no defaults. If not configured, a threshold will not trigger an alert.
