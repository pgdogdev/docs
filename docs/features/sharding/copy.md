# COPY

Copy is a special PostgreSQL command that ingests a file directly into a database table. This allows to ingest data faster than by using individual `INSERT` queries.
PgDog supports parsing this command, sharding the file automatically, and splitting the data between shards transparently to the application.
