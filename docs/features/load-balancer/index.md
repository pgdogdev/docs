---
next_steps:
  - ["Health checks", "/features/load-balancer/healthchecks", "Ensure replica databases are up and running. Block offline databases from serving queries."]
  - ["Replication & failover", "/features/load-balancer/replication-failover", "Replica lag detection and automatic traffic failover on replica promotion."]
  - ["Transactions", "/features/load-balancer/transactions", "Handling of manually-started transactions."]
  - ["Manual routing", "/features/load-balancer/manual-routing", "Overriding the load balancer using connection parameters or query comments."]
icon: material/lan
---

# Load balancer overview

PgDog understands the PostgreSQL wire protocol and uses the native PostgreSQL parser to understand queries. This allows it to split read queries from write queries and distribute traffic evenly between databases.

Applications can connect to a single PgDog [endpoint](#single-endpoint), without having to manually manage multiple connection pools.

## How it works

When a query is received by PgDog, it will inspect it using the native Postgres SQL parser. If the query is a `SELECT` and the [configuration](../../configuration/pgdog.toml/databases.md) contains both primary and replica databases, PgDog will send it to one of the replicas. For all other queries, PgDog will send them to the primary.

<center>
  <img src="/images/replicas.png" width="95%" alt="Load balancer" class="theme-aware-image" />
  <p>Load balancer topology</p>
</center>

Applications don't have to manually route queries between databases or maintain several connection pools internally.

### SQL compatibility

PgDog's query parser is powered by the `pg_query` library, which extracts the Postgres native SQL parser directly from its source code. This makes it **100% compatible** with the PostgreSQL query language and allows PgDog to understand all valid PostgreSQL queries.

## Load distribution

The load balancer is configurable and can distribute read queries between replicas using one of the following strategies:

* [Round robin](#round-robin) (default)
* [Random](#random)
* [Least active connections](#least-active-connections)

Choosing the best strategy depends on your query workload and the size of the databases. Each strategy has its pros and cons. If you're not sure, using the **round robin** strategy usually works well for most deployments.

### Round robin

Round robin is often used in HTTP load balancers (e.g., nginx) to evenly distribute requests between hosts, in the same order as they appear in the configuration. Each database receives exactly one transaction before the next one is used.

This algorithm makes no assumptions about the capacity of each database or the cost of each query. It works best when all queries have similar runtime cost and replica databases have identical hardware.

##### Configuration

Round robin is used **by default**, so no config changes are required. You can still set it explicitly in [pgdog.toml](../../configuration/pgdog.toml/general.md), like so:

=== "pgdog.toml"
    ```toml
    [general]
    load_balancing_strategy = "round_robin"
    ```
=== "Helm chart"
    ```yaml
    loadBalancingStrategy: round_robin
    ```

### Random

The random strategy sends queries to a database based on the output of a random number generator modulus the number of replicas in the configuration. This strategy assumes no knowledge about the runtime cost of queries or the capacity of database hardware.

This algorithm is often effective when queries have unpredictable runtime. By randomly distributing them between databases, it reduces hot spots in the replica cluster.

##### Configuration

=== "pgdog.toml"
    ```toml
    [general]
    load_balancing_strategy = "random"
    ```
=== "Helm chart"
    ```yaml
    loadBalancingStrategy: random
    ```

### Least active connections

Least active connections sends queries to replica databases that appear to be least busy serving other queries. This uses the [`sv_idle`](../../administration/pools.md) connection pool metric and assumes that pools with a high number of idle connections have more available resources.

This algorithm is useful when you want to "bin pack" the replica cluster. It assumes that queries have different runtime performance and attempts to distribute load more intelligently.

##### Configuration

=== "pgdog.toml"
    ```toml
    [general]
    load_balancing_strategy = "least_active_connections"
    ```
=== "Helm chart"
    ```yaml
    loadBalancingStrategy: least_active_connections
    ```


## Single endpoint

The load balancer can split reads (`SELECT` queries) from write queries. If it detects that a query is _not_ a `SELECT`, like an `INSERT` or an `UPDATE`, that query will be sent to the primary database. This allows PgDog to proxy an entire PostgreSQL cluster without requiring separate read and write endpoints.

This strategy is effective most of the time and the load balancer can handle several edge cases.

### SELECT FOR UPDATE

The most common edge case is `SELECT FOR UPDATE` which locks rows for exclusive access. Much like the name suggests, it's often used to update the selected rows, which is a write operation.

The load balancer detects this and will send this query to the primary database instead of a replica.

!!! note "Transaction required"

    `SELECT FOR UPDATE` is used inside manual [transactions](transactions.md) (i.e., started with `BEGIN`), which are routed to the primary database by default.

### Write CTEs

Some `SELECT` queries can trigger a write to the database from a CTE, for example:

```postgresql
WITH t AS (
  INSERT INTO users (email) VALUES ('test@test.com') RETURNING id
)
SELECT * FROM users INNER JOIN t ON t.id = users.id
```

The load balancer recursively checks CTEs and, if any of them contains a query that could trigger a write, it will send the whole statement to the primary database.

## Using the load balancer

The load balancer is **enabled by default** when more than one database with the same `name` property is configured in [pgdog.toml](../../configuration/pgdog.toml/databases.md), for example:

=== "pgdog.toml"
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
=== "Helm chart"
    ```yaml
    databases:
      - name: prod
        role: primary
        host: 10.0.0.1
      - name: prod
        role: replica
        host: 10.0.0.2
    ```

## Primary reads

By default, if replica databases are configured, the primary is treated as one of them when serving read queries. This is done to maximize the use of existing hardware and prevents overloading a replica when it is first added to the database cluster.

This behavior is configurable in [pgdog.toml](../../configuration/pgdog.toml/general.md#read_write_split). You can isolate your primary from read queries and allow it to only serve writes:

=== "pgdog.toml"
    ```toml
    [general]
    read_write_split = "exclude_primary"
    ```
=== "Helm chart"
    ```yaml
    readWriteSplit: exclude_primary
    ```

### Failover for reads

In case one of your replicas fails, you can configure the primary to serve read queries temporarily while you (or your cloud vendor) bring the replica back up. This is configurable, like so:

=== "pgdog.toml"
    ```toml
    [general]
    read_write_split = "include_primary_if_replica_banned"
    ```
=== "Helm chart"
    ```yaml
    readWriteSplit: include_primary_if_replica_banned
    ```

### Replicas optional

Migrating applications to use replicas can take some time, especially if some queries are replica lag-sensitive, e.g., a read query issued immediately after a write. To make it easier to migrate to PgDog, you can disable replicas for reads, while explicitly opting specific queries in via [manual routing](manual-routing.md):

=== "pgdog.toml"
    ```toml
    [general]
    read_write_split = "prefer_primary"
    ```
=== "Helm chart"
    ```yaml
    readWriteSplit: prefer_primary
    ```

Enabling this will make PgDog send all queries to the primary unless specified otherwise with a [query comment](manual-routing.md#query-comments) or a [session parameter](manual-routing.md#parameters).

## Learn more

{{ next_steps_links(next_steps) }}

### Tutorial

<center>
    <iframe width="100%" height="500" src="https://www.youtube.com/embed/ZaCy_FPjfFI?si=QVETqaOiKbLtucl1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</center>
