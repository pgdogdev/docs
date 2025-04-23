# Health checks

Databases proxied by PgDog are regularly checked with health checks. A health check is a simple query, e.g.
`SELECT 1`, that ensures the database is reachable and able to process queries.

## How it works

If a database fails a health check, it's placed in a list of banned hosts. Banned databases are removed
from the load balancer and will not serve queries. This allows PgDog to reduce errors clients see
when a database fails, for example due to hardware issues.

<center>
  <img src="/images/healtchecks.png" width="65%" alt="Healtchecks"/>
</center>

### Checking connections

In addition to checking databases, PgDog ensures that every connection in the pool is healthy on a regular basis. Before giving a connection to a client, PgDog will occasionally send the same simple query to the server, and if the query fails, ban the entire database from serving any more queries.

To reduce the overhead of health checks, connection-specific checks are done infrequently, configurable via the `healtcheck_interval` setting.

### Triggering bans

A single health check failure will prevent the entire database from serving traffic, which may seem aggressive at first, but reduces the error rate dramatically in heavily used production deployments. PostgreSQL is very reliable, so even a single query failure may indicate an issue with hardware or network connectivity.


#### Failsafe

To avoid health checks taking a database cluster offline, the load balancer has a built-in safety mechanism. If all replicas fail health checks, the banned host list is cleared and all databases are allowed to serve traffic again. This ensures that intermittent network failures don't impact database operations. Once the banned host list is cleared, load balancing returns to its initial, normal state.

#### Ban expiration

Host bans have an expiration. Once the ban expires, the replica is unbanned and allowed to serve traffic again. This is done to maintain a healthy level of traffic across all databases and to allow for intermittent
issues, like network connectivity, to resolve themselves without manual intervention.

This is controlled with the `ban_timeout` setting, e.g.:

```toml
ban_timeout = 60_000 # 1 minute
```

## Configuration

Health checks are **enabled** by default and are used for all databases. Health check interval is configurable
on a global and database levels.

By default, a database is issued a health check every **30 seconds**:

```toml
[global]
healthcheck_interval = 30_000 # 30 seconds in ms

[[databases]]
name = "prod"
healthcheck_interval = 60_000 # 1 minute in ms
```

### Timeouts

By default, PgDog gives the database **5 seconds** to answer a health check. This is configurable with `healthcheck_timeout`. If it doesn't receive a reply, the database will be banned from serving traffic.

```toml
[global]
healthcheck_timeout = 5_000 # 5 seconds in ms
ban_timeout = 60_000 # 1 minute in ms
```
