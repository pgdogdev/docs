# Multitenancy

PgDog is a natural fit for multitenant databases. It allows to separate data using a key, like `tenant_id`, and automatically route queries with that key to the right database or schema.

## How it works

There are two ways to enforce multitenancy rules with PgDog:

1. Physical multitenancy
2. Virtual multitenancy

**Physical** multitenancy separates data into multiple Postgres databases. In that scenario, it becomes very difficult for data from one tenant to make its way to another, providing a good layer of security and workload isolation between your customers.

**Virtual** multitenancy separates data into different schemas or just table rows, while storing everything in one Postgres database. It's a quick and cheap way to separate data without the additional overhead of provisioning databases or hardware for small customers.

## Physical multitenancy

Physical multitenancy is a form of [sharding](sharding/index.md). To make it work, you need to configure each database separately in [`pgdog.toml`](../configuration/pgdog.toml/databases.md). The databases must be part of the same cluster, i.e., have the same name and different shard numbers.

#### Example

```toml
[[databases]]
name = "prod"
host = "10.0.0.1"
shard = 0

[[databases]]
name = "prod"
host = "10.0.0.2"
shard = 1
```

### Routing queries

To route queries to the right tenant (aka shard), you need to configure the sharding logic in the same config file. Two entries are required:

1. The name and data type of the tenant ID column
2. The mapping between each value of that column and a shard number

The first one is configurable using [sharded tables](../configuration/pgdog.toml/sharded_tables.md), for example:

```toml
[[sharded_tables]]
database = "prod"
column = "tenant_id"
data_type = "bigint"
```

This tells PgDog that the column `tenant_id` in _all_ tables will have the data type `BIGINT` and should be used for routing queries between shards. See [supported data types](sharding/sharding-functions.md#supported-data-types) for a list of data types you can use for sharding.

The mapping is configurable separately for each tenant ID. Here, you have two options: **list-based** and **range-based** mapping.

#### List-based mapping

List-based is the most natural mapping for multitenant systems where your tenants are uniquely identified by a value. For example, using configuration, you can tell PgDog to route tenants 1, 5, and 1,000 to shard 0:

```toml
[[sharded_mappings]]
database = "prod"
column = "tenant_id"
kind = "list"
values = [1, 5, 1_000]
shard = 0
```

You can specify as many mappings as you need and the list of values can contain as many tenants as you need. PgDog is using an efficient algorithm for mapping tenants to shards and supports millions of tenants as part of the same deployment.

#### Range-based mapping

Range-based mapping is identical to `PARTITION BY RANGE` in Postgres and can be used creatively to separate tenants based on a range of values. For example, you can map tenants with IDs between 1 and 100 to shard 0 and everyone else to shard 1 like so:

```toml
[[sharded_mappings]]
database = "prod"
column = "tenant_id"
kind = "range"
start = 1
end = 100
shard = 0

[[sharded_mappings]]
database = "prod"
column = "tenant_id"
kind = "range"
start = 100
shard = 0
```

Much like Postgres partitions, the start of the range is included in the range while the end is excluded.

!!! note
    The algorithm used for mapping tenants to a range is currently linear [_O(n)_], so you can specify several mappings before noticing any performance impact. We'll be improving it to use a binary tree shortly, which will make it _O(logn)_
    and scalable to millions of mappings.


## Virtual multitenancy

!!! warning
    This feature is currently a work-in-progress. We'll update this page
    regularly with its status. The documentation is written in a way as to reflect
    the desired state of this feature, not how it currently works.

Virtual multitenancy is a great option if your customers are small and can share the same compute. To make this work you have several options:

1. Place each of your tenants data into their own Postgres schema
2. Add a column in every table identifying your tenants and make sure your app includes it in every query

The first approach is usually simpler. It allows you to easily migrate your tenants to dedicated hardware later on and to create a clear boundary between your users, enforced by PgDog and Postgres roles & permissions.

The second approach is best used if you're familiar with [Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) and its limitations.

#### Schema-based multitenancy

To make this work, we just need to manipulate the `search_path` session variable on Postgres connections used by your application. Using a tenant to shard mapping, instead of routing queries to separate databases, PgDog will execute the following queries before giving the connection to a client:

```postgresql
SET search_path TO '<tenant_schema>', public;
SET ROLE TO '<tenant_role>';
```

Search path will make sure that queries don't need to use fully-qualified (schema included) names for tables, while setting the role will grant that connection access to those tables.
