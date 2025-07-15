---
next_steps:
  - ["Health checks", "/features/healthchecks/", "Learn how PgDog ensures only healthy databases serve read queries."]
---

# Load balancer

PgDog operates at the application layer (OSI Level 7) and is capable of load balancing queries across
multiple PostgreSQL replicas.

## How it works

When a query is sent to PgDog, it inspects it using a SQL parser. If the query is a `SELECT` and PgDog is configured to proxy database replicas, it will send that query
to one of the replicas. This allows to distribute queries between multiple databases, spreading the load evenly.

<center>
  <img src="/images/replicas.png" width="60%" alt="Load balancer" />
</center>

### Strategies

The PgDog load balancer is configurable and can route queries
using one of several strategies:

* Random (default)
* Least active connections
* Round robin

Choosing a strategy depends on your query workload and the size of replica databases. Each strategy has its pros and cons. If you're not sure, using the **random** strategy is usually good enough
for most deployments.


#### Random

Queries are sent to a database based using a random number generator modulus the number of replicas in the pool.
This strategy is the simplest to understand and often effective at splitting traffic evenly across the cluster. It's unbiased
and assumes nothing about available resources or query performance.

This strategy is used by **default**.

#### Least active connections

PgDog keeps track of how many active connections each database has and can route queries to databases
which are least busy executing requests. This allows to "bin pack" the cluster based on how seemingly active
(or inactive) the databases are.

This strategy is useful when all databases have identical resources and all queries have roughly the same
cost and runtime.

#### Round robin

This strategy is often used in HTTP load balancers, like nginx, to route requests to hosts in the
same order they appear in the configuration. Each database receives exactly one query before the next
one is used.

This strategy makes the same assumptions as [least active connections](#least-active-connections), except it makes no attempt to bin pack
the cluster with workload, and distributes queries evenly.

## Handling writes

The load balancer can split read `SELECT` queries from write queries. This strategy is effective 99% of the time, since `SELECT` queries that write to the database
are rare and are typically used for database maintenance.

!!! note
    `SELECT ... FOR UPDATE` is routed to the primary because it likely means the
    row is about to be updated.

If PgDog detects that a query is _not_ a `SELECT`, like an `INSERT` or and `UPDATE`, and it's configuration contains a primary,
that query will be sent to primary. This allows a PgDog deployment to proxy an entire PostgreSQL cluster without creating separate read and write endpoints.

### CTEs that write

Some `SELECT` queries can trigger a write to the database from a CTE, for example:

```postgresql
WITH t AS (
  INSERT INTO users (email) VALUES ('test@test.com') RETURNING id
)
SELECT * FROM users INNER JOIN t ON t.id = users.id
```

PgDog will check all CTEs and if any of them contain queries that could write, it will send that query to the primary.

## Configuration

The load balancer is enabled automatically when a database cluster contains more than
one database. For example:

```toml
[[databases]]
name = "prod"
role = "primary"
host = "10.0.0.1"

[[databases]]
name = "prod"
role = "replica"
host = "10.0.0.2"
```

## Read more

{{ next_steps_links(next_steps) }}

## Demo

<center>
    <iframe width="560" height="315" src="https://www.youtube.com/embed/ZaCy_FPjfFI?si=QVETqaOiKbLtucl1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</center>
