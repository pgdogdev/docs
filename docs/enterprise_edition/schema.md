---
icon: material/database-sync
---

# Schema management

PgDog inspects the database schema in order to automatically detect sharded and [omnisharded](../features/sharding/omnishards.md) tables. When new tables are added or existing tables are changed, PgDog's snapshot of the schema needs to be refreshed.

The open source edition supports refreshing the schema for single-node deployments only. The Enterprise edition takes care of synchronizing schema updates across multiple PgDog nodes, ensuring consistent configuration.

## How it works

When a client executes a DDL command, e.g. `CREATE TABLE`, PgDog will send a notification to the [control plane](control_plane/index.md). The control plane will then trigger a schema reload across all registered PgDog nodes.

<center>
    <img src="/images/ee/reload_schema.png" width="70%" alt="Reload schema">
</center>

This process takes place in the background, so the schema snapshot across nodes is eventually consistent. This is sufficient for most applications, since migrations run as a separate process and application traffic doesn't use new tables for a considerable amount of time after the schema is changed. This gives PgDog ample time to refresh its schema snapshot.

### Configuration

Schema reloading on DDL is enabled by default. This is configurable in [`pgdog.toml`](../configuration/pgdog.toml/general.md#reload_schema_on_ddl):

```toml
[general]
reload_schema_on_ddl = true
```

In the open source edition, this reloads the schema on the same node only, while in the Enterprise edition, this triggers a schema reload on all PgDog nodes part of the same deployment.
