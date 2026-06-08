---
icon: material/remote
---

# Control

Control settings configure PgDog's connection to the PgDog control plane.

!!! note "Enterprise edition"
    This feature is available in [Enterprise Edition](../../enterprise_edition/index.md) only.

```toml
[control]
endpoint = "http://localhost:8080"
token = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
metrics_interval = 1000
stats_interval = 5000
active_queries_interval = 5000
request_timeout = 1000
```

### `endpoint`

Control plane endpoint PgDog connects to.

Default: **`http://localhost:8080`** (required)

### `token`

Authentication token sent to the control plane.

Default: **none** (required)

### `metrics_interval`

How often, in milliseconds, PgDog sends metrics to the control plane.

Default: **`1_000`** (1 second)

### `stats_interval`

How often, in milliseconds, PgDog sends query statistics to the control plane.

Default: **`5_000`** (5 seconds)

### `active_queries_interval`

How often, in milliseconds, PgDog sends active query information to the control plane.

Default: **`5_000`** (5 seconds)

### `request_timeout`

HTTP request timeout, in milliseconds, for requests sent to the control plane.

Default: **`1_000`** (1 second)
