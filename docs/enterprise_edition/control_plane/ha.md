# High availability

The [control plane](index.md) supports deploying multiple instances on difference machines. In case of hardware failure, its responsibilities can be taken over by a standby instance with almost no downtime.

## How it works

The leader instance, elected using Raft, performs all actions and monitors PgDog instances conneted to it. Standby instances are also reachable via HTTP and will forward the request to the leader automatically.

If a leader fails, Raft will quickly promote one of the standby instances and the control plane will continue to operate normally. When the broken leader is replaced, it's added as a follower and the cluster goes back to a healthy state.

## Configuration

If you're using our [Helm chart](installation.md) to deploy the control plane, Raft can be easily enabled with configuration:

```yaml
raft:
  enabled: true
  token: "raft-secret-token"
```

Turning Raft on will change the deployment strategy to use a Kubernetes `StatefulSet` and attach a PVC (Persistent Volume Claim) to each pod, so make sure your Kube cluster has a configured default `StorageClass`.

All required Raft settings, including Raft log storage and the address and ID of each pod in the set will be automatically configured.

### Using a Secret

The Raft token is technically a secret and can be injected via an environment variable into each pod in the set.

First, create a `Secret` resource in the same namespace as the control plane, for example:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: control-secrets
type: Opaque
stringData:
  raft-token: "raft-secret-token"
```

Once the secret is created, you can reference it in the Helm chart configuration as follows:

```yaml
raft:
  enabled: true
  secret:
    name: control-secrets
    tokenKey: raft-token
```

### Manual configuration

If you're deploying the control plane in a non-Kubernetes environment, e.g., EC2, ECS, etc., you can configure high availability manually.

Each control plane node needs to be aware of all other nodes, so a basic Raft configuration looks as follows:

```toml
[raft]
token = "raft-auth-token"
cluster_name = "pgdog" # Immutable.
storage_path = "/path/to/durable/volume/raft.redb"

[[raft.members]]
id = "1"
address = "10.0.0.0"

[[raft.members]]
id = "2"
address = "10.0.0.1"

[[raft.members]]
id = "3"
address = "10.0.0.2"
```

!!! note "Number of nodes"

    For Raft to work correctly (and optimcally), configure three (3) nodes operating on different
    hardware instances. The number of nodes must always be odd (e.g., 3, 5, 7). The more nodes are part
    of the same cluster, the slower a Raft operation will become, since it requires majority consensus.
