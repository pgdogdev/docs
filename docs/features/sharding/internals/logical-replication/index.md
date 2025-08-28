# Logical replication overview

One of PgDog's most interesting features is its ability to interpret the logical replication protocol used by Postgres to synchronize replicas. This allows PgDog to reroute data depending on which shard it should go to in a sharded cluster. Since logical replication is streaming data in real time, PgDog can move data between shards invisibly to the client and without database downtime.

## Logical replication internals

Logical replication consists of two phases:

1. Data synchronization
2. Real time streaming of changes

The first phase uses `COPY` to move table data between primary and replica(s). The second phase starts once the first is complete and streams changes to the tables, as they happen, one row at a time.

Both phases happen over a special replication connection, using the PostgreSQL [replication protocol](https://www.postgresql.org/docs/current/protocol-replication.html).

### Replication protocol

The PostgreSQL replication protocol consists of a set of special commands which tell Postgres to send different kinds of data over the connection. For example, creating a replication slot can be done like so:

```postgresql
CREATE_REPLICATION_SLOT pgdog LOGICAL 'pgoutput';
```

Any application that understands the protocol can request streaming changes from the server:

```postgresql
START_REPLICATION pgdog 0/0;
```

!!! note
    You can try these commands manually by connecting to any database with `replication=database` client parameter:

    ```bash
    psql "dbname=postgres replication=database"
    ```

Logical replication is special since it can replicate a subset of tables (and data) without desynchronizing replicas. This makes it especially useful to PgDog since it can manipulate the stream.
