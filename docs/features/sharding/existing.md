# Existing databases

PgDog was built with the goal of sharding databases without downtime. It uses logical replication in the background to move (and shard) data between nodes. The base case for this process is a 1 shard database, i.e. an "unsharded" database.

## How it works

The logical replication protocol moves data between databases using a format easily understandable by an application. That application (i.e., PgDog) can read those messages and act based on the data it sees.

The protocol internals are [explained below](internals/logical-replication/index.md). PgDog takes the following steps to migrate one database from _N_ shards to _2N_ shards.

1. For each shard, create a replication slot on the primary (or replica)
2. Stream data from all existing shards into new shards, dropping rows that don't match the new sharding schema

Since data is sent from all old shards to all new shards, everything will make it over without losing any records.

### Performance

PostgreSQL supports thousands of concurrent replication slots, so this mechanism scales into thousands of shards, moving petabytes of data around large clusters. This process is taking place concurrently for all shards, hot data will be read concurrently and mostly from memory.
