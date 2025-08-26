# Maintenance mode

Maintenance mode pauses queries from all clients so you can synchronize configuration changes across multiple instances of PgDog. This is useful if you're changing the [sharding](../features/sharding/index.md) options.

### How it works

You can turn on maintenance mode by connecting to the [admin](index.md) database and running this query:

```
MAINTENANCE ON;
```

Clients that are currently executing a transaction will be allowed to finish, while all others will be immediately paused. Pausing traffic has the effect of holding query requests inside PgDog's network buffer. To the client, this will seem like the proxy isn't responding.

!!! note
    Before enabling maintenance mode, make sure to set the application-level timeouts high enough as to avoid erroring out.

During maintenance mode, you can perform live configuration changes. The following flow is typical and, if performed quickly, won't cause errors or downtime:

1. Make changes to `pgdog.toml` and/or `users.toml`
2. Enable maintenance mode
3. Reload config on all instances of PgDog
4. Disable maintenance mode

#### Turn off maintenance mode

Turning off maintenance mode and resuming all queries can be done with a query:

```
MAINTENANCE OFF;
```
