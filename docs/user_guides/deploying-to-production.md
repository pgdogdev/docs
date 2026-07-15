---
icon: material/rocket-launch
---

# Deploying to production

!!! note "Work in progress"
    This is a living document. Please come back for more tips as we discover them. Also, feel free to ping us on [Discord](https://discord.gg/CcBZkjSJdd) with your own learnings.

If you are ready to deploy PgDog to production, below are some tips on how to make that deployment stable and performant. These are collected directly from our users, customers, and our past experience running PostgreSQL proxies.

!!! info "Advice only"
    Your deployment can be different, so make sure to adjust our advice to match your specific situation.

## Workload isolation

If you are using our [Helm chart](../installation.md#kubernetes), make sure to deploy PgDog into its own node group, or at the very least, on instances not used by other applications.

Database proxies, like PgDog, are central points for serving queries. If PgDog's access to the CPU is throttled by the kernel or by the hypervisor, you will see increases in p95/p99 latency distributions, and hard to explain CPU usage in the PgDog processes.

### AWS EKS

Our Helm chart supports adding annotations that will make Kubernetes schedule the pods on the PgDog-designated node pool, for example:

```yaml title="values.yaml"
nodeSelector:
  eks.amazonaws.com/nodegroup: pgdog-dedicated
```

Deploying PgDog into its own node group protects its pods from noisy neighbors and from being rescheduled by Kube when other workloads need more capacity.

#### SLA

This advice only applies if your application has a strict latency SLA. If you can tolerate occasional bursts in tail latencies, you may not necessarily want to deploy PgDog this way; this is strictly a cost/performance trade-off, which most big deployments choose to make to ensure a high quality of service.
