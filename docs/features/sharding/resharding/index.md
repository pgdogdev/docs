# Resharding overview

!!! note
    This feature is a work in progress. Support for resharding with logical replication was started in [#279](https://github.com/pgdogdev/pgdog/pull/279).

Resharding adds more nodes to an existing database cluster, spreading the data evenly between all machines. Depending on which [sharding function](../sharding-functions.md) is used, this may require recomputing shard numbers for all rows and move them between databases.

## Hash-based resharding

PgDog's strategy for resharding for hash-sharded clusters is to create a new cluster with `N x 2` nodes (`N` is the number of nodes in the existing cluster) and move all data to the new cluster without downtime using logical replication.

[**→ Hash resharding**](hash.md)
