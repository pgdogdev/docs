---
icon: material/shield-check
---

# High availability

The [control plane](index.md) is deployed as a standalone application. If using our [Helm chart](installation.md), it's possible to deploy multiple replicas in different availability zones which can provide operational redundancy.

To make sure only one instance performs infrastructure changes, the control plane implements leader election and automatically selects _one_ pod to serve all requests.

## How it works

!!! note "Kubernetes only"
    This feature is only supported when running the control plane with Kubernetes. While a different synchronization primitive
    could have been used, we rely on the Kubernetes `Service` to redirect traffic.

<center>
    <img class="theme-aware-image" src="/images/ee/ha.png" width="100%" alt="Control plane">
</center>

When an instance of the control plane deployment is started, it attempts to acquire a `Lease` from the Kubernetes API. The lease is short-lived and is renewed periodically.

Whichever instance acquires the lease first will report itself as `"Ready"` to the `Service`. This ensures that only one instance can respond to API requests from both PgDog and the web UI.

### Configuration

This feature is **disabled** by default. It can be enabled and configured in the Helm chart:

```yaml title="values.yaml"
control:
  config:
    leader:
      enabled: true
      lease_name: "control2"
      lease_duration_secs: 15
      lease_interval_secs: 5
      release_timeout_secs: 5
```

Most of these settings have sane defaults:

| Configuration | Description |
|-|-|
| `enabled` | Toggle leader election on or off. It is disabled by default (`false`). |
| `lease_name` | The name of the `Lease` resource. Change it if you're planning to deploy more than one control plane per namespace. |
| `lease_duration_secs` | Lease duration. Longer values prevent lease takeover due to clock skew, but slow down redeployments after unexpected pod termination. |
| `lease_interval_secs` | How often the control plane leader attempts to renew the lease. |
| `release_timeout_secs` | How long the control plane will wait while shutting down gracefully for the lease to be released. |

### Default deployment

By default, the control plane is deployed with only one replica. This is usually sufficient since high availability is not essential for normal operations and PgDog pods can tolerate intermittent control plane downtime.
