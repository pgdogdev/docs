# Benchmarks

PgDog does its best to minimize its impact on database performance. Great care is taken to make sure as few operations as possible are performed
when passing data between clients and servers.

All benchmarks listed below were done on my local system (AMD Ryzen 7 5800X). Real world performance is impacted by factors like network speed, query complexity and especially by hardware used for running PgDog and PostgreSQL servers.

## pgbench

The simplest way to test PostgreSQL performance is with `pgbench`. It comes standard with all PostgreSQL installations (Mac and Linux):

```
$ pgbench --version
pgbench (PostgreSQL) 16.4 (Postgres.app)
```

A standard pgBench benchmark will run `INSERT`, `UPDATE`, `SELECT` and `DELETE` queries to get an overall view of database performance. Since we are only testing the performance of PgDog, we are going to run `SELECT` queries only and minimize the impact of hard disk I/O on this test.

This benchmark can be reproduced by passing the `-S` flag to `pgbench`. The results below were performed using the configuration found in [`pgdog.toml`](https://github.com/levkk/pgdog/blob/main/pgdog.toml).

## Results

### Multi-threaded

Numbers below are for a single database benchmark in transaction mode. `workers` are set to `4`, so PgDog is running 4 threads and using async I/O.

#### Protocol

The protocol column indicates what kind of communication protocol
pgbench is using to talk to PgDog/Postgres.

`simple` protocol is sending
queries with parameters included in query text. This requires Postgres
to receive only one message but has parsing overhead inside PgDog.

`extended` protocol separates parameters from query text. This prevents
SQL injection attacks, but PgDog is able to deduplicate statements and most parsing overhead.

`prepared` protocol is the fastest since pgbench is re-using the same
statements and only sends different parameters. This removes the need to parse
statements inside PgDog and Postgres.

#### The numbers

| Protocol | Clients | TPS | Latency |
|---------|-------|----|------------|
| simple | 1 | 10,790.06 | 0.093 ms |
| simple | 10 | 70,661.18 | 0.137 ms |
| simple | 100 | 78,232.15 | 1.266 ms |
| extended | 1 | 11,634.29 | 0.086 ms |
| extended | 10 | 74,529.28 | 0.128 ms |
| extended | 100 | 94,584.0 | 1.045 ms |
| prepared | 1 | 17,468.19 | 0.057 ms |
| prepared | 10 | 110,942.87 | 0.084 ms |
| prepared | 100 | 119,273.2 | 0.825 ms |

### Single-threaded

This benchmark ran with `workers` set to 0. This makes PgDog run in single-threaded mode, but still uses async I/O.

| Protocol | Clients | TPS | Latency |
|---------|-------|----|------------|
| simple | 1 | 11,042.68 | 0.090 ms |
| simple | 10 | 30,209.56 | 0.331 ms |
| simple | 100 | 28,931.41 | 3.349 ms |
| extended | 1 | 11,702.49 | 0.085 ms |
| extended | 10 | 49,920.91 | 0.200 ms |
| extended | 100 | 47,108.79 | 2.075 ms |
| prepared | 1 | 18,222.30 | 0.055 ms |
| prepared | 10 | 53,468.63 | 0.187 ms |
| prepared | 100 | 50,441.38| 1.943 ms |

### Interpretation

#### 1 client

Benchmarks with `-c 1` (1 client) are a good baseline for what's possible under the best possible circumstances. There is no contention on resources
and PgDog effectively receives data in one socket and pushes it out the other.

#### 10 clients

With 10 clients actively querying the database, the connection pool is at full capacity (`default_pool_size` is set to `10`). While there are no clients waiting for connections, the pool has to serve clients without any slack in the system.

#### 100 clients

With over 10x more clients connected than available servers, connections are fighting for resources and PgDog has to make sure everyone gets served in a fair way. Consistent throughput in this benchmark demonstrates our ability to timeshare server connections effectively.

### Parser overhead

PgDog parses statements to figure out where they should go. When using `simple` protocol, PgDog can't cache statements (since they include parameters), so the overhead of the parser is noticeable. When using `extended` and `prepared` protocols, the cache is doing its job and the parser overhead is almost entirely eliminated.

### In the real world

In production, PostgreSQL clients are expected to be mostly idle. For example, web applications spend a lot of their time parsing HTTP requests, running code and waiting on network I/O. This leaves plenty of time for PgDog (and PostgreSQL) to serve queries for thousands of clients.

#### Hardware impact

Benchmark results will vary widely with hardware. For example, these numbers will be better on new Apple M chips and slower on older Intel CPUs. This benchmark was ran on AMD Ryzen 7 5800X. Expect yours to vary, but the overall trend to be directionally similar.

### pgbench configuration

```bash
export PGPASSWORD=pgdog

pgbench -P 1 -h 127.0.0.1 -p 6432 \
    -U pgdog pgdog -c 10 -t 100000 -S \
    --protocol prepared
```
