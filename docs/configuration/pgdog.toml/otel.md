---
icon: material/chart-line
---

# OTEL

OTEL is a standard for sending telemetry from applications to backends that support it, like Grafana or Datadog. PgDog supports OTEL out of the box:

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

### `endpoint`

Endpoint where PgDog will push OTEL metrics.

### `datadog_api_key`

If using Datadog, configuring the API key here will automatically set
the authentication header.

To obtain a Datadog API key, go to your Organization settings / API keys.

!!! note "Kubernetes"
    If deploying with Kubernetes, you can source the API key from a `Secret` instead of setting it directly. See [Using a Secret](../../features/metrics.md#using-a-secret).

### `namespace`

By default, all metrics will be sent under the `pgdog` namespace, e.g.: `pgdog.sv_idle`.

### `headers`

HTTP headers sent with each OTLP push request. Use this to configure authentication or any custom
headers required by your OTLP backend.

In `pgdog.toml`, headers are configured as a sub-table:

=== "pgdog.toml"
    ```toml
    [otel.headers]
    DD-API-KEY = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    X-Custom = "foo"
    ```
=== "Helm chart"
    ```yaml
    otel:
      headers:
        DD-API-KEY: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        X-Custom: "foo"
    ```

Headers can also be set via the `OTEL_EXPORTER_OTLP_HEADERS` environment variable, as a
comma-separated list of `key=value` pairs.

### `push_interval`

How often, in milliseconds, to push metrics to the OTLP endpoint.

_Default:_ `10000`

## Environment variables

PgDog honors the standard OpenTelemetry environment variables. When set, they override the
corresponding `pgdog.toml` values (or supply a value when the setting is omitted).

| Variable | Description |
| --- | --- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP metrics ingest URL. Equivalent to `endpoint`. |
| `OTEL_EXPORTER_OTLP_HEADERS` | Comma-separated `key=value` pairs added to OTLP push requests. Equivalent to `[otel.headers]`. |
| `OTEL_METRIC_EXPORT_INTERVAL` | Push interval in milliseconds. Equivalent to `push_interval`. |
| `OTEL_SERVICE_NAME` | Sets the `service.name` resource attribute. Takes precedence over any value set via `OTEL_RESOURCE_ATTRIBUTES`. _Default:_ `pgdog`. |
| `OTEL_RESOURCE_ATTRIBUTES` | Comma-separated `key=value` pairs added as resource attributes on every metric (e.g. `env=prod,region=us-east-1`). Values may be percent-encoded. |
| `PGDOG_OTEL_NAMESPACE` | Metric name prefix. Equivalent to `namespace`. |
| `DD_API_KEY` | Datadog API key. Equivalent to `datadog_api_key`. |

PgDog automatically sets the following resource attributes on every exported metric:
`service.name` (defaults to `pgdog`), `service.instance.id`, and `host.name`. Use
`OTEL_RESOURCE_ATTRIBUTES` to add or override any of these.
