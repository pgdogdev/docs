# Hash resharding

If you're using the `HASH` sharding function, adding a new node to the cluster will change the modulo number by 1. The number returned by the hash function is uniformly distributed across the entire integer range, which makes it considerably larger than the modulo. Therefore, changing it will more often than not result in most rows remapped to different shard numbers.

You can visualize this phenomenon with a bit of Python:

=== "2 shards"

    ```python
    >>> list(map(lambda x: x % 2, [1000, 1001, 1002, 1003, 1004]))
    [0, 1, 0, 1, 0]
    ```

=== "3 shards"
    ```python
    >>> list(map(lambda x: x % 3, [1000, 1001, 1002, 1003, 1004]))
    [1, 2, 0, 1, 2]
    ```

Since most rows will have to moved, resharding a cluster in-place would put a lot of load on an already overextended system.

PgDog's strategy for resharding is to **move data** from an existing cluster to a completely new one, while rehashing the rows in-flight. This process is parallelizable and fast, and since most of the work is done by the new cluster, production databases are not affected.

## Data sync

Moving data online is a 2 step process:

1. Copy data from tables using Postgres `COPY`
2. Stream real time changes using logical replication

To make sure no rows are lost in the process, PgDog follows a similar strategy used by Postgres in logical replication subscriptions, with some improvements.

### Copying tables

Copying table data from source database cluster is done using Postgres `COPY` and logical replication slots. This is implemented in the `data-sync` command:

```bash
pgdog data-sync --help
```

| Option | Description | Example |
|-|-|-|
| `--from-database` | Name of the **source** database cluster. | `prod` |
| `--from-user` | Name of the user configured in `users.toml` for the **source** database cluster. | `postgres` |
| `--to-database` | Name of the **destination** database cluster. | `prod-sharded` |
| `--to-user` | Name of the user configured in `users.tom` for the **destination** database cluster. | `postgres` |
| `--publication` | Name of the Postgres [publication](https://www.postgresql.org/docs/current/sql-createpublication.html) for tables to be copied and sharded. It should exist on the **source** database. | `all_tables` |

All databases and users must be configured in `pgdog.toml` and `users.toml`.

### Real time changes

After data sync is complete, changes for all tables in the publication will be streamed in real time. Keep this connection
open until you are ready to cut traffic over to the new database cluster.
