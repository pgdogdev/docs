---
icon: material/lan-check
---
# Health checks

All databases load balanced by PgDog are regularly checked with health checks. A health check is a small query that ensures the database is reachable and able to handle requests.

If a replica database fails a health check, it's temporarily removed from the load balancer, preventing it from serving queries for a configurable period of time.

<center>
  <img src="/images/healthchecks.png" width="95%" alt="Healthchecks"/>
</center>

## How it works

PgDog performs two kinds of health checks to ensure applications don't accidentally use a broken database to run a query:

| Health check | Description |
|-|-|
| Connection health check | Checks each connection in the pool before giving it to a client. This ensures all Postgres server connections are healthy. |
| Database health check | Checks idle databases to make sure they are still online and can serve queries. |

If a connection or database fails a health check, it is **temporarily removed** from the load balancer and cannot serve any more queries. This prevents applications from continuously hitting a broken database until it's restarted by an administrator.

!!! note "99.99% uptime"
    This strategy is very effective at reducing error rates in busy applications. If you are operating a large number of databases, hardware failures are relatively common and an effective load balancer is required to maintain 99.99% database uptime.

### Connection health check

A connection health check is occasionally performed when a client requests a connection from the connection pool. This happens when the client starts executing a transaction or sends an individual query.

The health check itself is an empty query (i.e., `;`) and is usually executed quite quickly by the Postgres server.

!!! note "Bypassing the Postgres parser"
    The empty query `;` has no commands, so Postgres doesn't use its parser to understand it. This only checks that the server on the other end of a connection is alive and responds to requests, which makes this especially quick.

If the health check query finishes successfully, the connection is marked healthy and given to the client to run the transaction. If not, the entire connection pool is banned from serving any additional queries and an error is returned to the client.

While the health check is cheap, running it on every single transaction is unnecessary and would cause undesirable latency. For this reason, the connection health check is performed once per configurable interval, controlled by the `healthcheck_interval` setting:

```toml
[general]
healthcheck_interval = 30_000 # Run a health check every 30 seconds
```

The **default** value is **30 seconds** (`30_000` milliseconds).

### Database health check

If your databases are relatively idle, connection health checks don't provide enough information about their state. This happens if your traffic has periods of inactivity, or serves only batch workloads.

The load balancer runs health check queries independently and asynchronously in the background. The frequency of background health checks is controlled by the `idle_healthcheck_interval` setting:

```toml
[general]
idle_healthcheck_interval = 30_000 # Run a health check every 30 seconds
```

The **default** value for this setting is **30 seconds** (`30_000` milliseconds).

#### Delaying health checks

When PgDog is first started, it's possible that the database or the network is not yet ready to handle requests. To make sure there are no false positives caused by a slow start, database health checks are started after a configurable delay, controlled by the `idle_healthcheck_delay` setting:

```toml
[general]
idle_healthcheck_delay = 5_000 # 5 seconds
```

The **default** value for this setting is **5 seconds** (`5_000` milliseconds).


### Primary database exception

While all databases receive health checks, only replicas can be removed from the load balancer. If the primary fails a health check, it will continue to serve writes. This is done because the database cluster doesn't have an alternative database to send write requests to and attempting to connect to the primary again has a higher chance of success than blocking queries outright.

## Restoring traffic

Databases are automatically put back into the load balancer after a period of time. This ensures that intermittent failures, like temporary network problems, don't require manual intervention by an administrator to restore service.

The amount of time the database is banned from serving traffic is controlled with the `ban_timeout` setting:

```toml
ban_timeout = 300_000 # 5 minutes
```

The **default** value is **5 minutes** (`300_000` milliseconds).

If the database is still broken once the ban expires, it will fail a health check and will be removed from the load balancer again.

### False positives

It's possible for widespread network outages to cause false positives and block all databases from serving traffic. To avoid the situation where entire database clusters are taken offline by health checks, the load balancer has a built-in safety mechanism.

If all replicas are banned due to health check failure, the ban list is cleared immediately and all databases are placed back into active service.

## Timeouts

By default, the load balancer gives the database a limited amount of time to answer a health check. If it doesn't receive a reply, the database will be marked unhealthy and removed from the load balancer.

This behavior is configurable with the `healthcheck_timeout` setting:

```toml
[global]
healthcheck_timeout = 5_000 # 5 seconds in ms
```

The default value is `5_000` (5 seconds).

The health check timeout detects more subtle failure cases, like a slow network or an overloaded database. Due to the nature of the health check query itself, only a truly broken database wouldn't be able to respond to it quickly, which makes this method reliable at detecting and removing broken hardware.

## Load balancer health check

If you're running multiple instances of PgDog, like in a Kubernetes cluster for example, it's common practice to deploy a TCP load balancer in front of them to distribute traffic evenly between the containers.

TCP load balancers use their own health checks to make sure the containers they are proxying are up and running. PgDog supports two kinds of load balancer health checks:

| Load balancer check | Description |
|-|-|
| TCP health check | The load balancer attempts to create a connection by sending the `SYN` packet to the traffic port. |
| HTTP health check | The load balancer sends an `HTTP/1.1 GET` request to a configurable port and expects `HTTP/1.1 200 OK` as a response. |

Since PgDog itself is a TCP application, no additional configuration is required to handle TCP health checks. HTTP health checks require running an additional endpoint.

### HTTP endpoint

If your load balancer supports sending HTTP health checks to a configurable port (like AWS NLBs, for example), you can configure PgDog to run an HTTP server to respond to them:

```toml
[general]
healthcheck_endpoint = 8080
```

This is configurable on startup only and will spin up an HTTP server on `http://0.0.0.0:8080` (or whatever port you set).

This health check looks at all configured connection pools, and if **at least one** is online, responds with `HTTP/1.1 200 OK`. If _all_ connection pools are down because of failed health checks, PgDog will respond with `HTTP/1.1 502 Bad Gateway`.

!!! note "Handling a lot of requests"
    The HTTP health check uses existing internal state to answer requests and doesn't send queries to the connection pools. This makes it very quick and inexpensive, which ensures that massively distributed load balancers (like the AWS NLB) don't cause an unexpected influx of requests to the database.

To make configuration easier, the health check endpoint doesn't support HTTPS, so make sure to configure your load balancer to use plain HTTP only.
