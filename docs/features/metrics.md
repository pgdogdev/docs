# Metrics

PgDog exposes real time metrics and statistics about clients, servers, connection pools, and more. They are available via two mediums:

1. A special [admin database](../administration/index.md)
2. OpenMetrics (e.g. Prometheus) endpoint

## Admin database

You can connect to the admin database using any PostgreSQL client. It supports custom commands, documented [here](../administration/index.md).

!!! note
    The admin database doesn't support prepared statements or transactions. Make sure your Postgres client
    is only using simple queries.

    #### Example in Python

    ```python
    import psycopg2
    conn = psycopg2.connect("dbname=admin host=127.0.0.1 port=6432 user=admin password=admin")
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("SHOW POOLS")
    pools = cur.fetchall()
    ```

    #### Example with psql

    ```bash
    PGPASSWORD=admin psql -h 127.0.0.1 -p 6432 -U admin admin -c 'SHOW POOLS'
    ```

## OpenMetrics

!!! note
    OpenMetrics suppport is currently a work in progress. Some metrics are missing.
    Progress will be reported in GitHub: [issue #70](https://github.com/pgdogdev/pgdog/issues/70).

[OpenMetrics](https://openmetrics.io/) is a standard for displaying metrics that can be ingested by a multitude of agents, e.g., Datadog, Prometheus, etc.

The endpoint is disabled by default. You can enable it by configuring which port it should run on:

```toml
[general]
openmetrics_port = 9090
```

Once PgDog is restarted, the endpoint will be available on `http://0.0.0.0:9090` and can be queried with any HTTP client, for example:

```bash
curl http://127.0.0.1:9000/metrics
```
