---
icon: material/wrench-cog-outline
---

# Configuration overview

PgDog uses the [TOML](https://toml.io/en/) configuration language for its two configuration files:

- [`pgdog.toml`](pgdog.toml/general.md)
- [`users.toml`](users.toml/users.md)

**Both** files are **required** for PgDog to run, but most settings are optional and have reasonable defaults, so a basic PgDog deployment requires very little work to configure:

=== "pgdog.toml"
    ```toml
    [[databases]]
    name = "pgdog"
    host = "127.0.0.1"
    ```
=== "users.toml"
    ```toml
    [[users]]
    name = "pgdog"
    password = "pgdog"
    database = "pgdog"
    ```

By default, PgDog looks for both configuration files in the current working directory (`$PWD`). Alternatively, you can pass the
`--config=<path>` and `--users=<path>` arguments on startup.

## Hot reload

Most settings can be reloaded without restarting PgDog. This allows you to tweak them at runtime without breaking client or server connections. For settings that require a restart, a note is added to the documentation.

## Units

To make things simpler, all units of time are in milliseconds. For example, if you want to set the pool checkout timeout to 5 seconds, convert it to 5000ms instead:

```toml
[general]
checkout_timeout = 5_000
```

!!! note "TOML syntax"
    Since PgDog uses TOML, both `5000` and `5_000` are valid numbers. Configuration will fail to load if non-integer values are used, e.g. "5s" or "53.5".

## Overview

Configuration is organized in the following sections:

| Name | Description |
|------|-------------|
| [General](pgdog.toml/general.md) | General pooler settings like `host`, `port` and various timeouts. |
| [Databases](pgdog.toml/databases.md) | PostgreSQL databases proxied by PgDog. |
| [Mirroring](pgdog.toml/mirroring.md) | Configuration to [mirror](../features/mirroring.md) databases for testing. |
| [Sharded tables](pgdog.toml/sharded_tables.md) | Configuration for [sharding](../features/sharding/basics.md) databases. |
| [Plugins](pgdog.toml/plugins.md) | Plugins configuration. |
| [Users](users.toml/users.md) | List of users (with passwords) that are allowed to connect to PgDog. |
| [Admin](pgdog.toml/admin.md) | Admin database settings like admin password. |
