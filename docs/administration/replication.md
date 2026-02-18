---
icon: material/content-copy
---

# Replication

PgDog provides a real time view into PostgreSQL replication for the purposes of monitoring [replication delay](../features/load-balancer/replication-failover.md#replication) and performing query traffic [failover](../features/load-balancer/replication-failover.md#failover).

You can view this data by connecting to the [admin](index.md) database and running this query:

```
SHOW REPLICATION;
```

The following information is returned for each database:

| Name | Description | Example |
|------|-------------|---------|
| `id` | Connection pool identifier matching pools in [`SHOW POOLS`](pools.md). | `4` |
| `database` | Name of the PostgreSQL database. | `postgres` |
| `user` | User used to connect to the database. | `postgres` |
| `addr` | IP address or DNS name of the server. | `127.0.0.1` |
| `port` | TCP port of the server. | `45001` |
| `shard` | Shard number of the database. | `0` |
| `role` | Database role, either `primary` or `replica`. | `replica` |
| `replica_lag` | Replication lag in milliseconds. | `0` |
| `pg_lsn` | Current LSN (Log Sequence Number) of the database. | `0/21000168` |
| `lsn_age` | Time since the last transaction in milliseconds. | `2245` |
| `pg_is_in_recovery` | Whether the database is in recovery mode (`t` = true, `f` = false). | `t` |
