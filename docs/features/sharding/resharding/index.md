---
icon: material/set-split
---

# Resharding Postgres

!!! note "Work in progress"
    This feature is in active development. Support for resharding with logical replication was started in [#279](https://github.com/pgdogdev/pgdog/pull/279) and
    received major improvements in [#784](https://github.com/pgdogdev/pgdog/pull/784).

Resharding changes the number of shards in an existing database cluster in order to add or remove capacity. To make this less impactful on production operations, PgDog's strategy for resharding is to create a new database cluster and reshard data while moving it to the new databases.

To make this an online process, with zero downtime or data loss, PgDog hooks into the logical replication protocol used by PostgreSQL and reroutes messages between nodes to create and update rows in real-time.

<center style="margin-top: 40px;">
  <img src="/images/resharding-arch-1.png" width="80%" height="auto" alt="Mirroring">
</center>

## Resharding process

The resharding process is composed of four independent operations. The first one is currently the responsibility of the user, while the remaining 3 are automated by PgDog:

| Operation | Description |
|-|-|
| [Create new cluster](databases.md) | Create a new set of empty databases that will be used for storing data in the new, sharded cluster. |
| [Schema synchronization](schema.md) | Replicate table and index definitions to the new shards, making sure the new cluster has the same schema as the old one. |
| [Move & reshard data](hash.md) | Copy data using logical replication, while redistributing rows in-flight between new shards. |
| [Cutover traffic](cutover.md) | Make the new cluster service both reads and writes from the application, without taking downtime. |

While each step can be executed separately by the operator, PgDog provides an [admin database](../../../administration/index.md) command to perform online resharding and traffic cutover steps in a completely automated fashion:

```
RESHARD <source> <destination> <publication>;
```

The `<source>` and `<destination>` parameters accept the name of the source and destination databases respectively. The `<publication>` parameter expects the name of the Postgres [publication](schema.md#publication) for the tables that need to be resharded.

!!! note "Traffic cutover"
    Traffic cutover requires careful synchronization to avoid data loss and a split-brain situation. The `RESHARD` command supports this for **single node** PgDog deployments only. The [Enterprise Edition](../../../enterprise_edition/index.md) provides a control plane, which supports traffic cutover with multiple PgDog containers.

## Terminology

| Term | Description |
|-|-|
| Source database | The database cluster that's being resharded and contains all data and table definitions. |
| Destination database | The database cluster with the new sharding configuration, to where the data will be copied from the source database. |
| Logical replication | Replication protocol available to PostgreSQL databases since version 10. |

## Next steps

{{ next_steps_links([
    ("Schema sync", "schema.md", "Synchronize table, index and other schema entities between the source and destination databases."),
    ("Move data", "hash.md", "Redistribute data between shards using the configured sharding function. This happens without downtime and keeps the shards up-to-date with the source database until traffic cutover."),
]) }}
