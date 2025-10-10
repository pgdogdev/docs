---
icon: material/help
---

# EXPLAIN command

`EXPLAIN` is a command that produces the query plan Postgres will use to execute a query. This allows you to check that the query is optimal, before running it.

PgDog can annotate the query plan returned by Postgres with its own routing decision. This allows you to check which shard(s) the query will be sent to, and if it will be sent to the primary or a replica.

### How it works

To avoid breaking existing tooling which relies on the standard `EXPLAIN` format, PgDog's `EXPLAIN` is disabled by default and can be turned on with configuration:

```toml
[general]
expanded_explain = true
```

When configured, all `EXPLAIN` queries will start returning two query plans: one for Postgres and one for PgDog. For example:

=== "Query"
    ```postgresql
    EXPLAIN SELECT * FROM users WHERE id = 1;
    ```

=== "Plan"
    ```
                                       QUERY PLAN
    -----------------------------------------------------------------------------
    Index Scan using users_pkey on sharded  (cost=0.15..8.17 rows=1 width=40)
    Index Cond: (id = 1)

    PgDog Routing:
    Summary: shard=0 role=replica
    Shard 0: matched sharding key users.id using constant
    (6 rows)
    ```

#### Query plan

PgDog's query plan contains the following information:

| Name | Description |
|-|-|
| `shard` | The shard number(s) where the query will be sent. |
| `role` | Whether the query will go to a replica or the primary. |

For each shard, an additional note will be returned, explaining the decision to
include it in the query plan. For cross-shard queries, a note will indicate why the query has to be sent to all shards, for example:

=== "Query"
    ```postgresql
    EXPLAIN SELECT * FROM users;
    ```
=== "Plan"
    ```
                            QUERY PLAN
    ------------------------------------------------------------
    Seq Scan on sharded  (cost=0.00..22.00 rows=1200 width=40)
    Seq Scan on sharded  (cost=0.00..22.00 rows=1200 width=40)

    PgDog Routing:
      Summary: shard=all role=replica
      Note: no sharding key matched; broadcasting
    (6 rows)
    ```
