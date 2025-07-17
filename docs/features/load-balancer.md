---
next_steps:
  - ["Health checks", "/features/healthchecks/", "Learn how PgDog ensures only healthy databases serve read queries."]
---

# Load balancer

PgDog operates at the application layer (OSI Level 7) and is capable of load balancing queries across
multiple PostgreSQL replicas.

## How it works

When a query is sent to PgDog, it inspects it using a SQL parser. If the query is a read and PgDog configuration contains multiple databases, it will send that query to one of the replicas, spreading the query load evenly between all instances in the cluster.

If the configuration contains the primary as well, PgDog will separate writes from reads and send writes to the primary, without requiring any application changes.

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

##### Configuration

```toml
[general]
load_balancer_strategy = "random"
```

#### Least active connections

PgDog keeps track of how many active connections each database has and can route queries to databases
which are least busy executing requests. This allows to "bin pack" the cluster based on how seemingly active
(or inactive) the databases are.

This strategy is useful when all databases have identical resources and all queries have roughly the same
cost and runtime.

##### Configuration

```toml
[general]
load_balancer_strategy = "least_active_connections"
```

#### Round robin

This strategy is often used in HTTP load balancers, like nginx, to route requests to hosts in the
same order they appear in the configuration. Each database receives exactly one query before the next
one is used.

This strategy makes the same assumptions as [least active connections](#least-active-connections), except it makes no attempt to bin pack the cluster with workload, and distributes queries evenly.

##### Configuration

```toml
[general]
load_balancer_strategy = "round_robin"
```

## Reads and writes

The load balancer can split reads (`SELECT` queries) from write queries. If PgDog detects that a query is _not_ a `SELECT`, like an `INSERT` or and `UPDATE`, that query will be sent to primary. This allows a PgDog deployment to proxy an entire PostgreSQL cluster without creating separate read and write endpoints.

This strategy is effective most of the time, and PgDog also handles several edge cases.

#### Select for update

The most common one is `SELECT [...] FOR UDPATE` which locks rows for exclusive access. Much like the name suggests, the most common use case for this is to update the row, which is a write operation. PgDog will detect this and send the query to the primary instead.

#### CTEs that write

Some `SELECT` queries can trigger a write to the database from a CTE, for example:

```postgresql
WITH t AS (
  INSERT INTO users (email) VALUES ('test@test.com') RETURNING id
)
SELECT * FROM users INNER JOIN t ON t.id = users.id
```

PgDog will check all CTEs and if any of them contain queries that could write, it will send the entire query to the primary.

### Transactions

All explicit transactions are routed to the primary. An explicit transaction is started by using the `BEGIN` statement, e.g.:

```postgresql
BEGIN;
INSERT INTO users (email, created_at) VALUES ($1, NOW()) RETURNING *;
COMMIT;
```

While more often used to atomically perform writes to multiple tables, transactions can also manually route read queries to the primary as to avoid having to handle replication lag for time-sensitive queries.

!!! note
    This is common with background jobs that get triggered after a row has been inserted by an HTTP controller.
    The job queue is often configured to read data from a replica, which is a few milliseconds behind the primary and, unless specifically handled, could run into "record not found" errors.


## Configuration

The load balancer is enabled automatically when cluster contains more than
one database, for example:

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

### Reads on the primary

By default, the primary is used for serving reads and writes. If you want to isolate your workloads and have your replicas serve all read queries, you can configure it like so:

```toml
[general]
read_write_split = "exclude_primary"
```

## Read more

{{ next_steps_links(next_steps) }}

## Demo

<center>
    <iframe width="560" height="315" src="https://www.youtube.com/embed/ZaCy_FPjfFI?si=QVETqaOiKbLtucl1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</center>
