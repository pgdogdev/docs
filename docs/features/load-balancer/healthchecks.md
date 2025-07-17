# Health checks

Databases proxied by PgDog are regularly checked with health checks. A health check is a simple query, e.g.,
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

To reduce the overhead of health checks, connection-specific checks are done infrequently, configurable via the `healtcheck_interval` setting:

```toml
[general]
healthcheck_interval = 30_000 # Run a health check every 30 seconds
```

Health checks are **enabled** by default. The default setting value is `30_000` (30 seconds).


### Triggering bans

A single health check failure will prevent the entire database from serving traffic. This may seem aggressive at first, but it reduces the error rate dramatically in heavily used production deployments. PostgreSQL is very reliable, so even a single query failure may indicate an issue with hardware or network connectivity.


#### Failsafe

To avoid health checks taking a database cluster offline, the load balancer has a built-in safety mechanism. If all replicas fail health checks, bans from all databases are removed and all databases are allowed to serve traffic again. This ensures that intermittent network failures don't impact database operations. Once the bans are removed, load balancing returns to its normal state.

#### Ban expiration

Database bans have an expiration. Once the ban expires, the replica is unbanned and allowed to serve traffic again. This is done to maintain a healthy level of traffic across all databases and to allow for intermittent
issues, like network connectivity, to resolve themselves without manual intervention.

This behavior is controlled with the `ban_timeout` setting:

```toml
[general]
ban_timeout = 300_000 # Expire bans automatically after 5 minutes
```

The default value is `300_000` (5 minutes).

### Health check timeout

By default, PgDog gives the database **5 seconds** to answer a health check. This is configurable with `healthcheck_timeout`. If PgDog doesn't receive a reply within that time frame, the database will be banned from serving traffic.

```toml
[global]
healthcheck_timeout = 5_000 # 5 seconds in ms
```

The default value is `5_000` (5 seconds).
