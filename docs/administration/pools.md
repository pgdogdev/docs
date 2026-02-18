---
icon: material/pool
---

# Connection pools

PgDog provides real time statistics and information on its connection pools. You can view them by connecting to the [admin database](index.md) and running the `SHOW POOLS` command:

```
SHOW POOLS;
```

The following information is returned for each connection pool (user/database pair) managed by PgDog:

| Name | Description | Example |
|------|-------------|---------|
| `id` | Pool identifier. | `1` |
| `database` | Name of the PostgreSQL database. | `myapp_prod` |
| `user` | User used to connect to the database. | `app_user` |
| `addr` | IP address or DNS name of the PostgreSQL server. | `10.0.1.5` |
| `port` | TCP port of the PostgreSQL server. | `5432` |
| `shard` | Shard identifier. | `0` |
| `role` | Database role. | `primary` |
| `cl_waiting` | Number of clients waiting for a connection from this pool. | `3` |
| `sv_idle` | Number of idle server connections in the pool. | `8` |
| `sv_active` | Number of checked out (used) server connections in the pool. | `12` |
| `sv_idle_xact` | Number of idle-in-transaction server connections in the pool. | `0` |
| `sv_total` | Total number of server connections in the pool. | `20` |
| `maxwait` | Maximum wait time for connections. | `30` |
| `maxwait_us` | Maximum wait time for connections in microseconds. | `30000000` |
| `pool_mode` | Connection pooling mode. | `transaction` |
| `paused` | The pool is paused and won't issue connections until resumed. | `f` |
| `banned` | The pool is blocked from serving more clients. | `f` |
| `errors` | Number of connections returned to the pool in a bad state, e.g. network connectivity broken. | `0` |
| `re_synced` | Number of connections that have been re-synchronized. | `2` |
| `out_of_sync` | Number of connections returned to the pool by clients that left it in a bad state, e.g. by issuing a query and not waiting for the result. | `0` |
| `online` | Whether the pool is online. | `t` |
| `replica_lag` | Replication lag for replica connections. | `0` |
| `schema_admin` | Whether this connection pool is used for schema synchronization. | `f` |
