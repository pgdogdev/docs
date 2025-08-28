# Health checks

Databases proxied by PgDog's load balancer are regularly checked with health checks. A health check is a simple query, e.g.,
`SELECT 1`, that ensures the database is reachable and able to handle requests. If a replica database fails a health check,
it's removed from the load balancer and prevented from serving additional queries for a configurable period of time.

<center>
  <img src="/images/healthchecks.png" width="65%" alt="Healthchecks"/>
</center>

### Primary checks

While all databases receive health checks, only replicas can be removed from the load balancer. If the primary fails a health check, it will continue to serve writes. This is because the cluster doesn't have an alternative place to route these requests and attempting the primary again has a higher chance of success than blocking queries outright.

### Individual connections

In addition to checking entire databases, the load balancer checks that every connection in the pool is healthy on a regular basis. Before giving a connection to a client, it will, from time to time, send a short query to the server, and if it fails, ban the entire database from serving any more requests.

To reduce the overhead of health checks, these connection-specific checks are done infrequently. This is configurable via the `healthcheck_interval` setting:

```toml
[general]
healthcheck_interval = 30_000 # Run a health check every 30 seconds
```

The default value for this setting is `30_000` (30 seconds).

### Configuring health checks

Health checks are **enabled** by default.

If you want, you can effectively disable them by setting both `healthcheck_interval` and `idle_healthcheck_interval` settings to a very high value, for example:

```toml
[general]
healthcheck_interval = 31557600000 # 1 year
idle_healthcheck_interval = 31557600000
```


### Database bans

A single health check failure will prevent the entire database from serving traffic. In our documentation (and the code), we refer to this as a "ban".

This may seem aggressive at first, but it reduces the error rate dramatically in heavily used production deployments. PostgreSQL is very reliable, so even a single failure often indicates an issue with the hardware or network connectivity.


#### Failsafe

To avoid health checks taking the whole database cluster offline, the load balancer has a built-in safety mechanism. If all replicas fail a health check, the bans from all databases in the cluster are removed.

This makes sure that intermittent network failures don't impact database operations. Once the bans are removed, load balancing returns to its normal state.

#### Ban expiration

Database bans eventually expire and are removed automatically. Once this happens, the banned databases are allowed to serve traffic again. This is done to maintain a healthy level of traffic across all databases and to allow for intermittent issues, like network connectivity, to resolve themselves without manual intervention.

This behavior can be controlled with the `ban_timeout` setting:

```toml
[general]
ban_timeout = 300_000 # Expire bans automatically after 5 minutes
```

The default value for this setting is `300_000` (5 minutes).

#### Health check timeout

By default, the load balancer gives the database **5 seconds** to answer a health check. If it doesn't receive a reply within that time frame, the database will be banned and removed from the load balancer.

 This is configurable with `healthcheck_timeout` setting:

```toml
[global]
healthcheck_timeout = 5_000 # 5 seconds in ms
```

The default value is `5_000` (5 seconds).
