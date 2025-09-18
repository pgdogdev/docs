# Server connections

PgDog provides real time statistics and information on all connections to PostgreSQL databases. They can be accessed by connecting to the [admin database](index.md) and running the `SHOW SERVERS` command:

```
SHOW SERVERS;
```

The following information is returned for each connection from PgDog to a PostgreSQL database:

| Name | Description | Example |
|------|-------------|---------|
| `database` | Name of the PostgreSQL database. | `shard_0` |
| `user` | User used to connect to the database. | `pgdog` |
| `addr` | IP address or DNS name of the server. | `localhost` |
| `port` | TCP port of the server. | `5432` |
| `state` | Server connection state, e.g. `active`, `idle in transaction`, etc. | `receiving data` |
| `connect_time` | Timestamp when the connection was established. | `2025-09-17 19:55:37.958 -07:00` |
| `request_time` | Timestamp of the last request on this connection. | `2025-09-17 19:55:37.965 -07:00` |
| `remote_pid` | Process ID of the PostgreSQL backend process. | `1384` |
| `transactions` | Number of transactions completed by this server connection. | `1` |
| `queries` | Number of queries executed by this server connection. | `1` |
| `rollbacks` | Number of automatic rollbacks executed on this server connection by PgDog to clean up after idle transactions left by clients. | `0` |
| `prepared_statements` | Number of prepared statements created on this server connection. | `0` |
| `healthchecks` | Number of healthchecks executed on this server connection. | `0` |
| `errors` | Number of errors this connection has produced e.g. syntax errors. | `0` |
| `bytes_received` | Number of bytes received over the network. | `60` |
| `bytes_sent` | Number of bytes sent over the network. | `56` |
| `age` | How long ago this connection was created (in ms). | `851` |
| `application_name` | Application name set by the client connection. | `PgDog Pub/Sub Listener` |
| `memory_used` | Amount of memory used by this connection (in bytes). | `1787` |
