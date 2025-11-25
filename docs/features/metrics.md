---
icon: material/chart-line
---
# Metrics

PgDog exposes real-time metrics and statistics about clients, servers, connection pools, and more. They are available via two media:

1. The [admin database](../administration/index.md)
2. OpenMetrics (e.g., Prometheus) endpoint

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

```toml
[general]
openmetrics_port = 9090
```

This setting can only be configured on startup. Once configured, the endpoint will be available on `http://0.0.0.0:9090` and can be queried with any HTTP client, for example:

```bash
curl http://127.0.0.1:9090/metrics
```

#### Namespace

To avoid name conflicts between PgDog's metrics and your own, you can namespace these metrics with a configurable prefix:

```toml
[general]
openmetrics_namespace = "pgdog_"
```

!!! note "Prefix format"
    Some OpenMetrics implementations don't support special characters in the metric name (e.g., periods, commas, etc.). In that case,
    you can use an underscore (`_`) instead.

## Available metrics

The following metrics are exported via the OpenMetrics endpoint:

| Metric Name | Description | Type |
|------------|-------------|------|
| `clients` | Total number of connected clients. | `gauge` |
| `cl_waiting` | Clients waiting for a connection from a pool. | `gauge` |
| `sv_active` | Servers currently serving client requests. | `gauge` |
| `sv_idle` | Servers available for clients to use. | `gauge` |
| `sv_idle_xact` | Servers currently idle in transaction. | `gauge` |
| `maxwait` | How long clients have been waiting for a connection (in seconds). | `gauge` |
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
