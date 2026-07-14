---
icon: material/home
---

# Introduction to PgDog

PgDog is a connection pooler, load balancer and database sharder for PostgreSQL. Written in Rust, PgDog is fast, reliable and scales Postgres databases without requiring changes to your application.

## Getting started

PgDog is an open source project. You can download its code from our [repository](https://github.com/pgdogdev/pgdog) in GitHub. If you're deploying PgDog to your cloud (or on prem), you can use our [Docker image](installation.md) (and Helm chart), the [compiled binaries](https://github.com/pgdogdev/pgdog/releases) (incl. a `.deb` package), or build it from source.

### Docker image 
Every commit in the `main` branch, and weekly tagged releases, have corresponding images in our [Docker](https://github.com/orgs/pgdogdev/packages/container/package/pgdog) repository, for example:

```bash
docker run ghcr.io/pgdogdev/pgdog:v0.1.48
```

You can read more about how to deploy PgDog [here](installation.md).

## Why PgDog

PostgreSQL is a process-based, single-primary database. As such, it has hard limits on how many clients can connect, how many queries a single server can execute, and how much data it can write at any given time.

PgDog helps you work around these limits. It's a single binary, deployed between your application and the database, that speaks both the protocol applications use to talk to Postgres and the replication protocol Postgres uses internally. This lets PgDog do its job transparently, without changes to Postgres or the applications that query it.

## Connection pooler

Like PgBouncer or RDS Proxy, PgDog is a connection pooler: it multiplexes thousands of application connections over just a handful of Postgres server connections. This effectively removes the limit on how many clients a PostgreSQL database can serve at once.

Unlike those proxies, PgDog handles features that usually force a pooler to pin or reset connections. It supports SET statements, LISTEN/NOTIFY, and advisory locks without breaking connection state, so your application keeps working as if it were talking to Postgres directly.

PgDog is also multithreaded, so a single instance can serve many more clients while still relying on the same small number of Postgres connections.

You can read more about how the connection pooler works [here](features/connection-pooler/index.md).

## Load balancer

If your database has read replicas, PgDog can distribute read queries across them using one of several built-in load balancing [algorithms](features/load-balancer/index.md). This lets you scale reads simply by adding replicas, with no application changes and no extra infrastructure like HAProxy or Patroni.

You can read more about how PgDog load balances queries [here](features/load-balancer/index.md).


## Sharding PostgreSQL

Unlike NoSQL databases, PostgreSQL can serve INSERT, UPDATE, and DELETE queries from only one server. Once that server's capacity is exceeded, applications have to find new and creative ways to reduce their load on the database, such as batching requests or deferring workloads to run overnight.

At the same time, database operators face rising operating costs from vacuums that fall behind schedule, table bloat and downtime. Incidents become frequent, and engineers end up more focused on keeping the database from breaking than on building new features.

The solution to an overextended database is sharding: splitting all tables and indices equally between multiple machines. For example, if your primary database is 750 GB, splitting it into 3 shards will produce 3 databases of 250 GB each. As databases get smaller, vacuums start to catch up, indices fit into memory again, and queries run faster with reliable performance.

As shards accumulate more data and grow, they can be split again, scaling PostgreSQL horizontally. Sharded databases can grow into petabytes (thousands of TB) while serving both OLTP and OLAP workloads.

<center>
  <img src="/images/resharding-intro.png" class="theme-aware-image" width="85%" alt="How PgDog sharding works" />
</center>

PgDog operates on the application layer of the stack: it speaks PostgreSQL and understands not only the queries sent by applications but also the logical replication protocol used by the server. This allows it to automatically route queries while moving data between machines to create more capacity.

This documentation provides a detailed overview of all PgDog features, along with reference material for production operations.

## Read more

{{ next_steps_links([
    ("Installation", "/installation/", "Deploy PgDog with Helm on Kubernetes, run it on AWS ECS with Terraform, with Docker, with pre-built binaries, or by building from source."),
    ("Connection pooler", "/features/connection-pooler/", "Multiplex thousands of application connections over a small number of PostgreSQL server connections."),
    ("Load balancer", "/features/load-balancer/", "Distribute read queries across replicas and send write queries to the primary database."),
    ("Sharding", "/features/sharding/", "Scale PostgreSQL horizontally with query routing, data migration, and schema management."),
]) }}
