---
icon: material/chart-line
---
# Metrics

PgDog exposes real-time metrics and statistics about clients, servers, connection pools, and more. They are available via three media:

1. The [admin database](../administration/index.md)
2. OpenMetrics (e.g., Prometheus) endpoint
3. OTEL exporter

## Admin database

You can connect to the admin database using any PostgreSQL client. It supports custom commands, documented [here](../administration/index.md).

!!! note "Prepared statements"
    The admin database doesn't support prepared statements or transactions. Make sure your Postgres client
    is only using simple queries.

    === "Python"
        ```python
        import psycopg2
        conn = psycopg2.connect("dbname=admin host=127.0.0.1 port=6432 user=admin password=admin")
        conn.autocommit = True
        cur = conn.cursor()

        cur.execute("SHOW POOLS")
        pools = cur.fetchall()
        ```
    === "psql"
        ```bash
        PGPASSWORD=admin psql -h 127.0.0.1 -p 6432 -U admin admin -c 'SHOW POOLS'
        ```

## OpenMetrics

[OpenMetrics](https://openmetrics.io/) is a standard for displaying metrics that can be ingested by a multitude of agents, e.g., Datadog, Prometheus, etc. The metrics are shown in a human-readable text format
and available from an HTTP endpoint.

### Configuration

The endpoint is disabled by default. You can enable it by configuring which port it should run on:

=== "pgdog.toml"
    ```toml
    [general]
    openmetrics_port = 9090
    ```
=== "Helm chart"
    ```yaml
    openMetricsPort: 9090
    ```

This setting can only be configured on startup. Once configured, the endpoint will be available on `http://0.0.0.0:9090` and can be queried with any HTTP client, for example:

```bash
curl http://127.0.0.1:9090/metrics
```

#### Namespace

To avoid name conflicts between PgDog's metrics and your own, you can namespace these metrics with a configurable prefix:

=== "pgdog.toml"
    ```toml
    [general]
    openmetrics_namespace = "pgdog_"
    ```
=== "Helm chart"
    ```yaml
    openMetricsNamespace: pgdog_
    ```

!!! note "Prefix format"
    Some OpenMetrics implementations don't support special characters in the metric name (e.g., periods, commas, etc.) while others prefer a period (`.`, e.g. Datadog).

    To make these metrics display correctly when collected with the Datadog agent, set `openmetrics_namespace` to `"pgdog."` instead.

## OTEL

OTEL is a standard for publishing metrics to compatible systems, like Grafana, Prometheus and other providers like Datadog. PgDog can export metrics to a configured endpoint on an interval, making metrics collection work out of the box.

### Configuration

OTEL export is disabled by default. To enable it, configure the collector endpoint and the necessary credentials. If you're using Datadog, you can set the API key as a separate setting.

See [`[otel]` configuration](../configuration/pgdog.toml/otel.md) for the full list of settings, including custom headers, push interval, and supported `OTEL_*` environment variables.

=== "pgdog.toml"
    ```toml
    [otel]
    datadog_api_key = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    endpoint = "https://otlp.us5.datadoghq.com/v1/metrics"
    ```
=== "Helm chart"
    ```yaml
    otel:
      datadogApiKey: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      endpoint: "https://otlp.us5.datadoghq.com/v1/metrics"
    ```

#### Using a Secret

If deploying with Kubernetes, you can keep the Datadog API key out of the config by referencing an existing Kubernetes `Secret` instead. The chart injects it as the `DD_API_KEY` environment variable.

The `Secret` resource should be in the same namespace as the chart release:

```bash title="kubectl"
kubectl create secret generic my-datadog \
  --namespace pgdog \
  --from-literal=dd-api-key=<your-datadog-api-key>
```

The secret can then be referenced in `values.yaml`:

```yaml title="values.yaml"
otel:
  endpoint: "https://otlp.us5.datadoghq.com/v1/metrics"
  datadogApiKeySecret:
    name: my-datadog
    key: dd-api-key
```

#### Namespace

All metrics by default will be pushed to the `pgdog` namespace. For example, `sv_active` will be reported as `pgdog.sv_active`. The namespace is configurable, for example:

=== "pgdog.toml"
    ```toml
    [otel]
    endpoint = "https://otlp.us5.datadoghq.com/v1/metrics"
    namespace = "namespace"
    ```
=== "Helm chart"
    ```yaml
    otel:
      endpoint: "https://otlp.us5.datadoghq.com/v1/metrics"
      namespace: "namespace"
    ```

## Available metrics

The following metrics are exported via the OpenMetrics endpoint:

| Metric Name | Description | Type |
|------------|-------------|------|
| `clients` | Total number of connected clients. | `gauge` |
| `cl_waiting` | Clients waiting for a connection from a pool. | `gauge` |
| `sv_active` | Servers currently serving client requests. | `gauge` |
| `sv_idle` | Servers available for clients to use. | `gauge` |
| `sv_idle_xact` | Servers currently idle in transaction. | `gauge` |
| `maxwait` | How long the first (oldest) client in the queue has waited (in seconds). | `gauge` |
| `errors` | Errors that connections in the pool have experienced. | `counter` |
| `out_of_sync` | Connections that have been returned to the pool in a broken state. | `counter` |
| `total_xact_count` | Total number of executed transactions. | `counter` |
| `total_xact_2pc_count` | Total number of executed two-phase commit transactions. | `counter` |
| `avg_xact_count` | Average number of executed transactions per statistics period. | `gauge` |
| `avg_xact_2pc_count` | Average number of executed two-phase commit transactions per statistics period. | `gauge` |
| `total_query_count` | Total number of executed queries. | `counter` |
| `avg_query_count` | Average number of executed queries per statistics period. | `gauge` |
| `total_received` | Total number of bytes received. | `counter` |
| `avg_received` | Average number of bytes received. | `counter` |
| `total_sent` | Total number of bytes sent. | `counter` |
| `avg_sent` | Average number of bytes sent. | `gauge` |
| `total_xact_time` | Total time spent executing transactions. | `counter` |
| `avg_xact_time` | Average time spent executing transactions. | `gauge` |
| `total_query_time` | Total time spent executing queries. | `counter` |
| `avg_query_time` | Average time spent executing queries. | `gauge` |
| `total_prepared_evictions` | Total number of prepared statements closed because of cache evictions. | `counter` |
| `avg_prepared_evictions` | Average number of prepared statements closed because of cache evictions. | `gauge` |
| `mirror_total_count` | Total number of requests considered for mirroring. | `counter` |
| `mirror_mirrored_count` | Total number of requests successfully mirrored. | `counter` |
| `mirror_dropped_count` | Total number of requests dropped due to exposure settings. | `counter` |
| `mirror_error_count` | Total number of mirror requests that encountered errors. | `counter` |
| `mirror_queue_length` | Current number of transactions in the mirror queue. | `gauge` |
| `query_cache_hits` | Queries already present in the query cache. | `counter` |
| `query_cache_misses` | New queries added to the query cache. | `counter` |
| `query_cache_direct` | Queries sent directly to a single shard. | `counter` |
| `query_cache_cross` | Queries sent to multiple or all shards. | `counter` |
| `query_cache_size` | Number of queries in the cache. | `gauge` |
| `prepared_statements` | Number of prepared statements in the cache. | `gauge` |
| `prepared_statements_memory_used` | Number of bytes used for the prepared statements cache. | `gauge` |
| `prepared_statements_limit` | Maximum number of prepared statements that can be cached. | `gauge` |
| `max_connections` | Maximum number of allowed server connections. | `gauge` |
| `total_connect_count` | Total number of connections established to servers. | `counter` |
| `avg_connect_count` | Average number of connections established to servers. | `gauge` |
| `total_connect_time` | Total time spent connecting to servers. | `counter` |
| `avg_connect_time` | Average time spent connecting to servers. | `gauge` |
| `total_idle_xact_time` | Total time spent idling inside transactions. | `counter` |
| `avg_idle_xact_time` | Average time spent idling inside transactions. | `gauge` |
| `total_reads` | Total number of read transactions. | `counter` |
| `avg_reads` | Average number of read transactions per statistics period. | `gauge` |
| `total_writes` | Total number of write transactions. | `counter` |
| `avg_writes` | Average number of write transactions per statistics period. | `gauge` |
| `total_rollbacks` | Total number of abandoned transactions that had to be rolled back automatically. | `counter` |
| `avg_rollbacks` | Average number of abandoned transactions that had to be rolled back automatically. | `gauge` |
| `total_server_errors` | Total number of errors returned by server connections. | `counter` |
| `avg_server_errors` | Average number of errors returned by server connections. | `gauge` |
| `total_cleaned` | Total number of times server connections were cleaned from client parameters. | `counter` |
| `avg_cleaned` | Average number of times server connections were cleaned from client parameters. | `gauge` |
| `query_cache_limit` | Maximum number of queries that can be stored in the cache. | `gauge` |
| `query_cache_parse_time` | Time spent parsing queries due to cache misses. | `counter` |
| `query_cache_fingerprints` | Number of query fingerprints calculated. | `counter` |
| `total_auth_attempts` | Total number of server authentication attempts. | `counter` |
| `avg_auth_attempts` | Average number of server authentication attempts per statistics period. | `gauge` |
| `pub_sub_listeners` | Current number of clients listening on a pub/sub channel. | `gauge` |
| `pub_sub_listener_received` | Total number of notifications received by pub/sub listeners. | `counter` |
| `pub_sub_listener_dropped` | Total number of notifications dropped by lagging pub/sub listeners. | `counter` |
| `two_pc_recovered_total` | Total number of in-flight 2PC transactions restored from the WAL during recovery. | `counter` |
