---
icon: material/network
---

# Network

PgDog speaks the Postgres protocol which, underneath, uses TCP. Optimal TCP settings are necessary to quickly recover from database incidents. For example:

```toml
[tcp]
keepalive = true
time = 60_000
interval = 60_000
retries = 3
user_timeout = 5_000
```

To be consistent with the rest of PgDog documentation, units of time are in milliseconds. However, many TCP implementations only support seconds. Consider using round units, e.g., `1_000` milliseconds = 1 second.

!!! note "Support for keep-alives"
    Not all networks support or play well with TCP keep-alives. If you see an increased number of dropped connections after enabling these settings, you may have to disable them.

### `keepalives`

Enable TCP keep-alives. When enabled, idle client & server connections will send keep-alive packets to make sure the TCP connections are healthy.

Default: **`true`** (enabled)

### `time`

Configures the `TCP_KEEPALIVE` TCP socket option. Amount of time after which the connection is declared "idle" and keep-alive messages are sent to maintain it.

Default: **none** (system default: 2 hours)

### `interval`

Controls the value of the `TCP_KEEPINTVL` socket setting. Amount of time between keep-alive messages.

Default: **none** (system default)

### `retries`

Controls the value of the `TCP_KEEPCNT` socket setting. How many times to retry a failed keep-alive message until the connection is terminated.

Default: **none** (system default)

### `user_timeout`

Controls the value of the `TCP_USER_TIMEOUT` socket setting. Amount of time data in the socket can be unacknowledged by the peer before the connection is closed. Protects against dead networks / black holes.

Default: **none** (disabled)
