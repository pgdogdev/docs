---
icon: material/cog
---

# Configuration

PgDog provides real time access to its current configuration values. They can be accessed by connecting to the [admin database](index.md) and running the `SHOW CONFIG` command:

```
SHOW CONFIG;
```

The following configuration parameters are available and their current values:

| Name | Example |
|------|---------|
| `auth_type` [:material-link:](../configuration/pgdog.toml/general.md#auth_type) | `scram` |
| `ban_timeout` [:material-link:](../configuration/pgdog.toml/general.md#ban_timeout) | `5m` |
| `checkout_timeout` [:material-link:](../configuration/pgdog.toml/general.md#checkout_timeout) | `1s` |
| `client_idle_timeout` [:material-link:](../configuration/pgdog.toml/general.md#client_idle_timeout) | `18446744073709551615ms` |
| `connect_attempt_delay` [:material-link:](../configuration/pgdog.toml/general.md#connect_attempt_delay) | `0ms` |
| `connect_attempts` [:material-link:](../configuration/pgdog.toml/general.md#connect_attempts) | `1` |
| `connect_timeout` [:material-link:](../configuration/pgdog.toml/general.md#connect_timeout) | `1s` |
| `cross_shard_disabled` | `false` |
| `default_pool_size` [:material-link:](../configuration/pgdog.toml/general.md#default_pool_size) | `10` |
| `dns_ttl` | `default` |
| `dry_run` [:material-link:](../configuration/pgdog.toml/general.md#dry_run) | `false` |
| `healthcheck_interval` [:material-link:](../configuration/pgdog.toml/general.md#healthcheck_interval) | `30s` |
| `healthcheck_timeout` | `5s` |
| `host` [:material-link:](../configuration/pgdog.toml/general.md#host) | `0.0.0.0` |
| `idle_healthcheck_delay` [:material-link:](../configuration/pgdog.toml/general.md#idle_healthcheck_delay) | `5s` |
| `idle_healthcheck_interval` [:material-link:](../configuration/pgdog.toml/general.md#idle_healthcheck_interval) | `30s` |
| `idle_timeout` [:material-link:](../configuration/pgdog.toml/general.md#idle_timeout) | `1m` |
| `load_balancing_strategy` [:material-link:](../configuration/pgdog.toml/general.md#load_balancing_strategy) | `round_robin` |
| `log_connections` [:material-link:](../configuration/pgdog.toml/general.md#log_connections) | `true` |
| `log_disconnections` [:material-link:](../configuration/pgdog.toml/general.md#log_disconnections) | `true` |
| `min_pool_size` [:material-link:](../configuration/pgdog.toml/general.md#min_pool_size) | `1` |
| `mirror_exposure` [:material-link:](../configuration/pgdog.toml/general.md#mirror_exposure) | `1.0` |
| `mirror_queue` [:material-link:](../configuration/pgdog.toml/general.md#mirror_queue) | `128` |
| `openmetrics_namespace` [:material-link:](../configuration/pgdog.toml/general.md#openmetrics_namespace) | `pgdog_` |
| `openmetrics_port` [:material-link:](../configuration/pgdog.toml/general.md#openmetrics_port) | `9090` |
| `passthrough_auth` [:material-link:](../configuration/pgdog.toml/general.md#passthrough_auth) | `disabled` |
| `pooler_mode` [:material-link:](../configuration/pgdog.toml/general.md#pooler_mode) | `transaction` |
| `port` [:material-link:](../configuration/pgdog.toml/general.md#port) | `6432` |
| `prepared_statements` [:material-link:](../configuration/pgdog.toml/general.md#prepared_statements) | `extended` |
| `prepared_statements_limit` [:material-link:](../configuration/pgdog.toml/general.md#prepared_statements_limit) | `500` |
| `pub_sub_channel_size` [:material-link:](../configuration/pgdog.toml/general.md#pub_sub_channel_size) | `4098` |
| `query_cache_limit` | `500` |
| `query_log` | `default` |
| `query_timeout` [:material-link:](../configuration/pgdog.toml/general.md#query_timeout) | `1s` |
| `read_write_split` [:material-link:](../configuration/pgdog.toml/general.md#read_write_split) | `include_primary` |
| `read_write_strategy` | `aggressive` |
| `rollback_timeout` [:material-link:](../configuration/pgdog.toml/general.md#rollback_timeout) | `1s` |
| `shutdown_timeout` [:material-link:](../configuration/pgdog.toml/general.md#shutdown_timeout) | `1m` |
| `tls_certificate` [:material-link:](../configuration/pgdog.toml/general.md#tls_certificate) | `default` |
| `tls_private_key` [:material-link:](../configuration/pgdog.toml/general.md#tls_private_key) | `default` |
| `tls_server_ca_certificate` [:material-link:](../configuration/pgdog.toml/general.md#tls_server_ca_certificate) | `default` |
| `tls_verify` [:material-link:](../configuration/pgdog.toml/general.md#tls_verify) | `prefer` |
| `two_phase_commit` [:material-link:](../configuration/pgdog.toml/general.md#two_phase_commit) | `false` |
| `two_phase_commit_auto` [:material-link:](../configuration/pgdog.toml/general.md#two_phase_commit_auto) | `default` |
| `workers` [:material-link:](../configuration/pgdog.toml/general.md#workers) | `2` |
| `tcp_congestion_control` | `default` |
| `tcp_interval` | `default` |
| `tcp_keepalive` | `true` |
| `tcp_retries` | `default` |
| `tcp_time` | `default` |
| `tcp_user_timeout` | `default` |
