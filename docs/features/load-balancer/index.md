---
next_steps:
  - ["Health checks", "/features/healthchecks/", "Ensure replica databases are up and running. Block offline databases from serving queries."]
icon: material/lan
---

# Load balancer overview

PgDog understands the PostgreSQL wire protocol and uses its SQL parser to understand queries. This allows it to split read queries from write queries and distribute traffic evenly between databases.

Applications can connect to a single PgDog [endpoint](#single-endpoint), without having to manually manage multiple connection pools.

## How it works

When a query is received by PgDog, it will inspect it using the native Postgres SQL parser. If the query is a `SELECT` and the [configuration](../../configuration/pgdog.toml/databases.md) contains both primary and replica databases, PgDog will send it to one of the replicas. For all other queries, PgDog will send them to the primary.

<center>
  <img src="/images/replicas.png" width="95%" alt="Load balancer" />
</center>

Applications don't have to manually route queries between databases or maintain several connection pools internally.

!!! note "SQL compatibility"
    PgDog's query parser is powered by the `pg_query` library, which extracts the Postgres native SQL parser directly from its source code. This makes it **100% compatible** with the PostgreSQL query language and allows PgDog to understand all valid Postgres queries.

## Load distribution

The load balancer is configurable and can distribute read queries between replicas using one of the following strategies:

* Round robin (default)
* Random
* Least active connections

Choosing the best strategy depends on your query workload and the size of the databases. Each one has its pros and cons. If you're not sure, using the **round robin** strategy usually works well for most deployments.

### Round robin

Round robin is often used in HTTP load balancers (e.g., nginx) to evenly distribute requests to hosts, in the same order as they appear in the configuration. Each database receives exactly one query before the next one is used.

This algorithm makes no assumptions about the capacity of each database host or the cost of each query. It works best when all queries have similar runtime cost and replica databases have identical hardware.

##### Configuration

Round robin is used **by default**, so no config changes are required. You can still set it explicitly in [pgdog.toml](../../configuration/pgdog.toml/general.md), like so:

```toml
[general]
load_balancing_strategy = "round_robin"
```

### Random

The random strategy sends queries to a database based on the output of a random number generator modulus the number of replicas in the configuration. This strategy assumes no knowledge about the runtime cost of queries or the size of database hardware.

This algorithm is often effective when queries have unpredictable runtime. By randomly distributing them between databases, it reduces hot spots in the replica cluster.

##### Configuration

```toml
[general]
load_balancing_strategy = "random"
```

### Least active connections

Least active connections sends queries to replica databases that appear to be least busy serving other queries. This uses the [`sv_idle`](../../administration/pools.md) connection pool metric and assumes that pools with a high number of idle connections have more available resources.

This algorithm is useful when you want to "bin pack" the replica cluster. It assumes that queries have different runtime performance and attempts to distribute load more intelligently.

##### Configuration

```toml
[general]
load_balancing_strategy = "least_active_connections"
```


## Single endpoint

The load balancer can split reads (`SELECT` queries) from write queries. If it detects that a query is _not_ a `SELECT`, like an `INSERT` or an `UPDATE`, that query will be sent to the primary database. This allows PgDog to proxy an entire PostgreSQL cluster without requiring separate read and write endpoints.

This strategy is effective most of the time and the load balancer can handle several edge cases.

### SELECT FOR UPDATE

The most common edge case is `SELECT FOR UPDATE` which locks rows for exclusive access. Much like the name suggests, it's often used to update the selected rows, which is a write operation.

The load balancer detects this and will send this query to the primary database instead of a replica.

### Write CTEs

Some `SELECT` queries can trigger a write to the database from a CTE, for example:

```postgresql
WITH t AS (
  INSERT INTO users (email) VALUES ('test@test.com') RETURNING id
)
SELECT * FROM users INNER JOIN t ON t.id = users.id
```

The load balancer recursively checks all of them and, if any CTE contains a query that could trigger a write, it will send the whole statement to the primary database.

### Transactions

All manual transactions are sent to the primary database by default. Transactions are started by sending the `BEGIN` command, for example:

```postgresql
BEGIN;
INSERT INTO users (email, created_at) VALUES ($1, NOW()) RETURNING *;
COMMIT;
```

PgDog processes queries immediately upon receiving them, and since transactions can contain multiple statements, it isn't possible to determine whether the whole transaction writes to the database. Therefore, it is more reliable to send it to the primary database.

!!! note "Replica lag"
    While transactions are used to atomically change multiple tables, they can also be used to manually route `SELECT` queries to the primary database. For example:

    ```postgresql
    BEGIN;
    SELECT * FROM users WHERE id = $1;
    COMMIT;
    ```


    This is useful when the data in the table(s) has been recently updated and you want to avoid errors caused by replication lag. This often manifests as "record not-found"-style errors, for example:

    ```
    ActiveRecord::RecordNotFound (Couldn't find User with 'id'=9999):
    ```

    While sending read queries to the primary adds load, it is often necessary in real-time systems that are not equipped to handle replication delays.


#### Read-only transactions

The PostgreSQL query language allows you to declare a transaction as read-only. This prevents it from writing data to the database. PgDog takes advantage of this property and will send such transactions to a replica database.

Read-only transactions can be started with the `BEGIN READ ONLY` command, for example:

```postgresql
BEGIN READ ONLY;
SELECT * FROM users WHERE id = $1;
COMMIT;
```

Read-only transactions are useful when queries depend on each other's results and need a consistent view of the database. Some Postgres database drivers allow this option to be set in the code, for example:

=== "pgx (go)"
    ```go
    tx, err := conn.BeginTx(ctx, pgx.TxOptions{
        AccessMode: pgx.ReadOnly,
    })
    ```
=== "Sequelize (node)"
    ```javascript
    const tx = await sequelize.transaction({
      readOnly: true,
    });
    ```
=== "SQLAlchemy (python)"
    Add `postgresql_readonly=True` to [execution options](https://docs.sqlalchemy.org/en/20/core/connections.html#sqlalchemy.engine.Engine.execution_options), like so:
    ```python
    engine = create_engine("postgresql://user:pw@pgdog:6432/prod")
              .execution_options(postgresql_readonly=True)
    ```

#### Primary-only connections

If you need to override the load balancer routing decision and send a query (or all queries) to the primary, it's possible to do so by configuring the `pgdog.role` connection parameter.

Configuring this connection parameter can be done at connection creation:

=== "Connection URL"
    ```bash
    postgres://pgdog:pgdog@10.0.0.0:6432/database?options=-c%20pgdog.role%3Dprimary
    ```
=== "asyncpg (Python)"
    ```python
    conn = await asyncpg.connect(
        user="pgdog",
        password="pgdog",
        database="pgdog",
        host="10.0.0.0",
        port=6432,
        server_settings={
            "pgdog.role": "primary",
        }
    )
    ```
=== "SQLAlchemy (Python)"
    ```python
    engine = create_async_engine(
        "postgresql+asyncpg://pgdog:pgdog@10.0.0.0:6432/pgdog",
        pool_size=20,
        max_overflow=30,
        pool_timeout=30,
        pool_recycle=3600,
        pool_pre_ping=True,
        connect_args={"server_settings": {"pgdog.role": "primary"}},
    )
    ```

The following values are supported:

| Value | Routing decision |
|-|-|
| `primary` | Queries are sent to the primary database only. |
| `replica` | Queries are load balanced between primary and replicas, depending on the value of the [`read_write_split`](../../configuration/pgdog.toml/general.md#read_write_split) setting. |


## Using the load balancer

The load balancer is **enabled by default** when more than one database with the same `name` property is configured in [pgdog.toml](../../configuration/pgdog.toml/databases.md), for example:

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

## Primary reads

By default, if replica databases are configured, the primary is treated as one of them when serving read queries. This is done to maximize the use of existing hardware and prevents overloading a replica when it is first added to the database cluster.

This behavior is configurable in [pgdog.toml](../../configuration/pgdog.toml/general.md#read_write_split). You can isolate your primary from read queries and allow it to only serve writes:

```toml
[general]
read_write_split = "exclude_primary"
```

#### Failover for reads

In case one of your replicas fails, you can configure the primary to serve read queries temporarily while you (or your cloud vendor) bring the replica back up. This is configurable, like so:

```toml
[general]
read_write_split = "include_primary_if_replica_banned"
```

### Manual routing

!!! note "New feature"
    This feature was added in commit version [`c49339f`](https://github.com/pgdogdev/pgdog/commit/c49339f70db8be63b76ebb3aa0f31433c4266f21). If using this feature, make sure to run the latest version of PgDog.

If your query is replica-lag sensitive (e.g., you are reading data that you just wrote), you can route it to the primary manually. The query router supports doing this with a query comment:

```postgresql
/* pgdog_role: primary */ SELECT * FROM users WHERE id = $1
```

## Learn more

{{ next_steps_links(next_steps) }}

### Tutorial

<center>
    <iframe width="100%" height="500" src="https://www.youtube.com/embed/ZaCy_FPjfFI?si=QVETqaOiKbLtucl1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</center>
