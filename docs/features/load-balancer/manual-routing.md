---
icon: material/routes
---

# Manual routing

PgDog's load balancer uses the PostgreSQL parser to understand and route queries between the primary and replicas. In certain situations, the overhead of parsing queries may be too high, e.g., when not using prepared statements.

To take advantage of the load balancer without the parser's overhead, you can provide a routing hint at connection creation.

## How it works

Startup parameters are connection-specific settings that are typically set on connection creation to configure database behavior. For example, this is how ORMs and web frameworks control settings like `application_name`, `work_mem`, `statement_timeout` and many others.

The Postgres protocol doesn't have any restrictions on parameter names or values, and PgDog can choose to forward those settings to Postgres (or not).

### Parameters

PgDog has two parameters that control which database is used for all queries on a client connection:

| Parameter | Description |
|-|-|
| **`pgdog.role`** | Determines whether queries are sent to the primary database or the replica(s). |
| **`pgdog.shard`** | Determines which shard the queries are sent to. |

The `pgdog.role` parameter accepts the following values:

| Parameter value | Behavior |
|-|-|
| `primary` | All queries are sent to the primary database. |
| `replica` | All queries are load balanced between replica databases, and possibly the primary if [`read_write_split`](../../configuration/pgdog.toml/general.md#read_write_split) is set to `include_primary` (default). |

The `pgdog.shard` parameter accepts a shard number for any database specified in [`pgdog.toml`](../../configuration/pgdog.toml/databases.md).

### Setting the parameters

Setting the parameter at connection creation is PostgreSQL driver-specific. Some of the common drivers and frameworks are shown below.

#### Database URL

Most PostgreSQL client libraries support the database URL format and can accept connection parameters as part of the URL. For example, when using `psql`, you can set the `pgdog.role` parameter like so:

```
psql postgres://user:password@host:6432/db?options=-c%20pgdog.role%3Dreplica
```

Depending on the environment, the parameters may need to be URL-encoded, e.g., `%20` is a space and `%3D` is the equals (`=`) sign.

#### asyncpg

[asyncpg](https://pypi.org/project/asyncpg/) is a popular PostgreSQL driver for asynchronous Python applications. It allows you to set connection parameters when creating a connection:

```python
conn = await asyncpg.connect(
    user="pgdog",
    password="pgdog",
    database="pgdog",
    host="10.0.0.0",
    port=6432,
    server_settings={
        "pgdog.role": "primary",
    }
)
```

#### SQLAlchemy

[SQLAlchemy](https://www.sqlalchemy.org/) is a popular Python ORM, which supports any number of PostgreSQL connection drivers. For example, if you're using `asyncpg`, you can set connection parameters as follows:

```python
engine = create_async_engine(
    "postgresql+asyncpg://pgdog:pgdog@10.0.0.0:6432/pgdog",
    pool_size=20,
    max_overflow=30,
    pool_timeout=30,
    pool_recycle=3600,
    pool_pre_ping=True,
    connect_args={"server_settings": {"pgdog.role": "primary"}},
)
```

#### Rails / ActiveRecord

[Rails](https://rubyonrails.org/) and ActiveRecord support passing connection parameters in the `database.yml` configuration file:

```yaml
# config/database.yml
production:
  adapter: postgresql
  database: pgdog
  username: user
  password: password
  host: 10.0.0.0
  options: "-c pgdog.role=replica -c pgdog.shard=0"
```

These options are passed to the [`pg`](https://github.com/ged/ruby-pg) driver, so if you're using it directly, you can create connections manually like so:

```ruby
require "pg"

conn = PG.connect(
  host: "10.0.0.0",
  # user, password, etc.
  options: "-c pgdog.role=primary -c pgdog.shard=1"
)
```

## Disable the parser

Once you've configured the desired database role (and/or shard) for each of your application connections, you can disable the query parser in [pgdog.toml](../../configuration/pgdog.toml/general.md#query_parser):

```toml
[general]
query_parser = "off"
```

!!! note "Session state"
    The query parser is used to intercept `SET` commands, which configure session variables at runtime. If the parser is disabled and your application uses `SET` commands to configure the connection at startup, PgDog will not be able to guarantee that connections have the correct session settings in [transaction mode](../transaction-mode.md).
