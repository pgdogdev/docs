---
icon: material/mirror-rectangle
---
# Mirroring


Database mirroring streams traffic, byte for byte, from one database to another. This allows you to test how databases respond to real, production traffic.

## How it works

Mirroring in PgDog is asynchronous and should have minimal impact on production databases: transactions are sent to a background worker, which in turn forwards them to one or more mirror databases. If any statement fails, the error is ignored and the next one is executed. All query results are discarded as well.

<center>
  <img src="/images/mirroring.png" width="80%" height="auto" alt="Mirroring" class="theme-aware-image">
  <p>Mirroring architecture</p>
</center>

### Configuration

To use mirroring, first configure both the mirror and the production database in [`pgdog.toml`](../configuration/pgdog.toml/databases.md). Once both databases are running, add a `[[mirroring]]` section:

=== "pgdog.toml"
    ```toml
    [[databases]]
    name = "prod"
    host = "10.0.0.1"
    
    [[databases]]
    name = "staging_db"
    host = "10.0.2.25"
    
    [[mirroring]]
    source_db = "prod"
    destination_db = "staging_db"
    # queue_length = 256  # Optional: overrides general.mirror_queue
    # exposure = 0.5      # Optional: overrides general.mirror_exposure
    ```
=== "Helm chart"
    ```yaml
    databases:
      - name: prod
        host: 10.0.0.1
      - name: staging_db
        host: 10.0.2.25
    mirroring:
      - sourceDb: prod
        destinationDb: stagingDb
        # queueLength: 256
        # exposure: 0.5
    ```

!!! note "Matching users"
    Mirrored databases are regular connection pools and require a user and password, configured in [`users.toml`](../configuration/users.toml/users.md). PgDog will use those settings to connect to the mirror database and forward queries, so make sure the **same** users are configured on both databases.

You can connect to the mirror database like any other. The same connection pool will be used for mirrored queries. The production database connection pools will not be affected, since all traffic streaming happens in the background.

Each client connected to the main database has its own queue, so concurrency scales linearly with the number of clients.

You can have as many mirror databases as you like. Queries will be sent to each one of them, in parallel. More mirrors will require more CPU and network resources, so make sure to allocate enough compute to PgDog in production.

### Mirror queue

If mirror databases can't keep up with production traffic, queries will back up in the queue. To make sure it doesn't overflow and cause out-of-memory errors, the size of the queue is limited:

=== "pgdog.toml"
    ```toml
    [general]
    mirror_queue = 500
    ```
=== "Helm chart"
    ```yaml
    mirrorQueue: 500
    ```

You can also configure the mirror queue settings on a per-mirror basis, for example:

=== "pgdog.toml"
    ```toml
    [[mirroring]]
    source_db = "source"
    destination_db = "dest"
    queue_length = 500
    ```
=== "Helm chart"
    ```yaml
    mirroring:
      - sourceDb: source
        destinationDb: dest
        queueLength: 500
    ```

If the queue gets full, all subsequent mirrored transactions will be dropped until there is space in the queue again.

!!! warning "Mirroring is not replication"
    Since mirror queues can drop queries, it is not a replacement for Postgres replication and should be used for testing/benchmarking purposes only.

### Exposure

It's possible to limit how much traffic mirror databases receive. This is useful when warming up databases restored from a backup, or if the mirror databases are smaller than production and can't handle as many transactions.

This is configurable using a percentage, relative to the number of transactions sent to the source database:

=== "pgdog.toml"
    ```toml
    [general]
    mirror_exposure = 0.5 # 50%
    ```
=== "Helm chart"
    ```yaml
    mirrorExposure: 0.5
    ```

The same setting can be configured on individual mirrors:

=== "pgdog.toml"
    ```toml
    [[mirroring]]
    source_db = "source"
    destination_db = "dest"
    exposure = 0.5
    ```
=== "Helm chart"
    ```yaml
    mirroring:
      - sourceDb: source
        destinationDb: dest
        exposure: 0.5
    ```

Acceptable values are between **0.0** (0%) and **1.0** (100%).

This is changeable at runtime, without restarting PgDog. When adding a mirror, it's a good idea to start small, e.g., with only 1% exposure (i.e., `mirror_exposure = 0.01`), and gradually increase it over time.

### Realism

PgDog tries to make mirrored traffic as realistic as possible. For each statement inside a transaction, we record the timing between that statement and the next one. When replaying traffic against a mirror, we pause between statements for the same amount of time. This helps reproduce lock contention experienced by production databases, on the mirror databases.

### Filtering

It's possible to filter what kind of statements mirrors receive using configuration, for example:

=== "pgdog.toml"
    ```toml
    [[mirroring]]
    source_db = "source"
    destination_db = "dest"
    level = "ddl"
    ```
=== "Helm chart"
    ```yaml
    mirroring:
      - sourceDb: source
        destinationDb: dest
        level: ddl
    ```

The `level` setting supports the following arguments:

| Argument | Description |
|-|-|
| `ddl` | Mirror only DDL statements, e.g., `CREATE`, `DROP`, etc. |
| `dml` | Mirror all statements except DDL, e.g. `INSERT`, `UPDATE`, etc. |
| `all` | Mirror all statements. This is the default. |

DDL-only mirroring is useful when maintaining long-running logical replicas, since the logical replication protocol doesn't support synchronizing schema changes.

#### Query parser

Filtering specific statements requires parsing queries. If your database setup doesn't have replicas or sharding, the query parser is typically disabled. Before using this feature, make sure to enable it in [`pgdog.toml`](../configuration/pgdog.toml/general.md#query_parser):

=== "pgdog.toml"
    ```toml
    [general]
    query_parser = "on"
    ```
=== "Helm chart"
    ```yaml
    queryParser: on
    ```
