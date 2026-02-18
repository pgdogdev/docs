---
icon: material/account-multiple
---

# Client connections

PgDog provides real time statistics and information on all client connections. They can be accessed by connecting to the [admin database](index.md) and running the `SHOW CLIENTS` command:

```
SHOW CLIENTS;
```

The following information is returned for each client connection to PgDog:

| Name | Description | Example |
|------|-------------|---------|
| `user` | User name the client is connected as. | `admin` |
| `database` | Database name the client is connected to. | `admin` |
| `addr` | IP address of the client. | `127.0.0.1` |
| `port` | TCP port client is connected from. | `53002` |
| `state` | Real time client state, e.g. `active`, `idle`, etc. | `idle` |
| `replication` | Replication mode if applicable. | `none` |
| `connect_time` | Timestamp when the client connected. | `2025-09-17 19:56:16.981 -07:00` |
| `last_request` | Timestamp of the last request from this client. | `2025-09-17 20:09:49.799 -07:00` |
| `queries` | Number of queries executed. | `2` |
| `transactions` | Number of completed transactions executed. | `2` |
| `transactions_2pc` | Number of two-phase commit transactions. | `0` |
| `wait_time` | How long the client had to wait to get a connection from the pool. This value increases monotonically if the client is waiting for a pool that's too busy to serve transactions. | `0` |
| `query_time` | Total time this client's queries took to run on a server. | `7.334` |
| `transaction_time` | Total time this client's transactions took to execute on the server, including idle in transaction time. | `7.340` |
| `bytes_received` | Number of bytes received over the network from the client. | `36` |
| `bytes_sent` | Number of bytes sent over the network to the client. | `12470` |
| `errors` | Number of errors the client has received, e.g. query syntax errors. | `0` |
| `application_name` | Application name set by the client. | `psql` |
| `memory_used` | Amount of memory used by this client connection (in bytes). | `2397` |
| `locked` | Whether the client connection is locked. | `f` |
| `prepared_statements` | Number of prepared statements created by this client. | `0` |
