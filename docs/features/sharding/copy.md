# COPY

`COPY` is a special PostgreSQL command that ingests a file directly into a database table. This allows ingesting data faster than by using individual `INSERT` queries.
PgDog supports parsing this command, sharding the file automatically, and splitting the data between shards, invisible to the application.

<center style="margin-top: 2rem;">
    <img src="/images/wire-protocol-copy.png" width="90%" alt="Cross-shard queries" />
</center>


## How it works

PgDog supports data sent via `COPY` formatted using any one of the 3 possible formats:

- CSV (comma-separated values)
- Text (PostgreSQL version of CSV, with `\t` as the delimiter)
- Binary (not frequently used)

### Expected syntax

`COPY` commands sent through PgDog should specify table columns explicitly. This allows it to parse the data stream correctly, knowing which column is the sharding key.

Take the following example:


=== "Table"
    ```postgresql
    CREATE TABLE "users" (
      id BIGINT PRIMARY KEY,
      email VARCHAR NOT NULL UNIQUE
    )
    ```
=== "Data"
    ```csv
    id,email
    1,admin@pgdog.dev
    2,alice@pgdog.dev
    3,bob@pgdog.dev
    ```

To ingest this data into the table, the following query should be used:

```postgresql
COPY "users" ("id", "email") FROM STDIN CSV HEADER;
```

This query specifies the column order, the file format, and that the file contains a header which should be ignored. If you're using psql, replace the `COPY` with the special `\copy` command.

!!! note
    While it's technically feasible to use the CSV header to determine the column order, it's possible to supply files
    without headers, and that would require PgDog to fetch the schema definition from the database, making this a more complex, multi-step process.

## Performance

By adding _N_ nodes to a sharded cluster, the performance of `COPY` increases _N_ times. Data sent through `COPY` is ingested into shards in parallel. This makes the performance of `COPY` as fast as data nodes can write data and the network can send/receive messages. The cost of parsing and sharding CSV data in PgDog is negligibly small.
