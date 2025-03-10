# PgDog

[PgDog](https://github.com/levkk/pgdog) is a PostgreSQL connection pooler, query router, load balancer and logical replication manager. With support for automatic sharding, PgDog scales databases into petabytes without compromising PostgreSQL features loved by developers.

## The Problem

Unlike NoSQL databases, like Cassandra or DynamoDB, PostgreSQL is a database that runs on a single machine. Once the resources of that machine are exceeded, applications have to find new, creative ways to buy more capacity, like reducing usage through caching or by batching workloads. Meanwhile, database operators are faced with increasing operating costs, like delayed vacuums, bloat and unreliable performance.

The solution to this problem is **sharding**: splitting a database and all its tables between multiple machines equally.

## Sharding PostgreSQL

Sharding PostgreSQL is a two-part problem. On the one hand, the data needs to be moved to multiple machines without losing rows or causing downtime for the application. On the other, once the data is split, applications need a way to send queries to the machines hosting the data.

1. Split tables between machines, without losing data or causing downtime for the application
2. Once sharded, applications need to send their queries to the right shard(s)

PgDog solves both simelteneously. It understands the logical replication protocol used by PostgreSQL and can move (and shard) data between databases, in real time. It comes with its own SQL parser, and can extract routing hints from queries automatically, without applications having to modify their queries in any way.

## Installation

PgDog is easily compiled from source. Before proceeding, make sure you have the latest version of the Rust
compiler, available from [rust-lang.org](https://rust-lang.org).

### Checkout the code

PgDog source code can be downloaded from [GitHub](https://github.com/levkk/pgdog):

```bash
git clone https://github.com/levkk/pgdog && \
cd pgdog
```

### Compile PgDog

PgDog should be compiled in release mode to make sure you get all performance benefits. You can do this with Cargo:

```bash
cargo build --release
```

### Configuration

PgDog is [configured](configuration/index.md) via two files:

* [`pgdog.toml`](configuration/index.md) which contains general pooler settings and PostgreSQL server information
* [`users.toml`](configuration/users.toml/users.md) which contains passwords for users allowed to connect to the pooler

The passwords are stored in a separate file to simplify deployments in environments where
secrets can be safely encrypted, like Kubernetes or AWS EC2.

Both files can to be placed in the current working directory (CWD) for PgDog to detect them. Alternatively,
you can pass the `--config` and `--secrets` arguments with their locations when starting PgDog.

#### Example `pgdog.toml`

Most PgDog configuration options have sensible defaults. This allows a basic primary-only configuration to be pretty short:

```toml
[general]
host = "0.0.0.0"
port = 6432

[[databases]]
name = "postgres"
host = "127.0.0.1"
```

#### Example `users.toml`

This configuration file contains a mapping between databases, users and passwords. Users not specified in this file
won't be able to connect to PgDog:

```toml
[[users]]
name = "alice"
database = "postgres"
password = "hunter2"
```

### Launch the pooler

Starting the pooler can be done by running the binary in `target/release` folder or with Cargo:


=== "Command"
    ```bash
    cargo run --release
    ```

=== "Output"
    ```
    INFO 🐕 PgDog 0.1.0
    INFO loaded pgdog.toml
    INFO loaded users.toml
    INFO loaded "pgdog_routing" plugin [1.0461ms]
    INFO 🐕 PgDog listening on 0.0.0.0:6432
    INFO new server connection [127.0.0.1:5432]
    ```

## Next steps

* [Features](features/index.md)
* [Configuration](configuration/index.md)
* [Architecture](architecture/index.md)
