# Schema sync

PgDog can copy tables, indexes and other entities from your production database to the new sharded database automatically. To make [data sync](hash.md) as efficient as possible, it splits the schema sync into two parts:

- Pre-data tables and primary keys
- Post-data secondary indices

Before syncing data, run the first part to create the necessary tables and primary key constraints. Once data sync is caught up, run the second step to create secondary indexes, sequences and other entities.

## How it works

PgDog has a command line interface you can call by running it directly. Schema sync is controlled by a CLI command:

```
pgdog schema-sync \
  --from-database <name> \
  --to-database <name> \
  --publication <publication>
```

Expected and optional parameters for this command are as follows:

| Parameter | Description |
|-|-|
| `--from-database` | The name of the source database in `pgdog.toml`. |
| `--to-database` | The name of the destination database in `pgdog.toml`. |
| `--publication` | The name of the Postgres table publication with the tables you want to sync. |
| `--dry-run` | Print the SQL statements that will be executed on the destination database and exit. |
| `--ignore-errors` | Execute SQL statements and ignore any errors. |
| `--data-sync-complete` | Run the post-data step to create secondary indices and sequences. |
