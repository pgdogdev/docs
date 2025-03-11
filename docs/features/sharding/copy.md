# COPY

`COPY` is a special PostgreSQL command that ingests a file directly into a database table. This allows to ingest data faster than by using individual `INSERT` queries.
PgDog supports parsing this command, sharding the file automatically, and splitting the data between shards transparently to the application.

## How it works

Data sent via `COPY` is formatted using one of 3 possible formats:

- CSV (comma-separated values)
- Text (PostgreSQL version of CSV, with `\t` as the delimiter)
- Binary (not frequently used)

PgDog supports both CSV and text formats out of the box. `COPY` commands executed against PgDog will be split between shards transparently.

### Expected syntax

`COPY` commands sent through PgDog should specify table columns explicitly. This allows PgDog to parse the data stream correctly, knowing which column is the sharding key.

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
    While it's technically possible to use the CSV header to determine the column order in the file, it's possible to supply files
    without headers, and that would require PgDog to fetch the schema definition from the database, making this a more complex, multi-step process.
