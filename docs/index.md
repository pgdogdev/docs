# Introduction to PgDog

[PgDog](https://github.com/pgdogdev/pgdog) is a sharder, connection pooler and load balancer for PostgreSQL. Written in Rust, PgDog is fast, reliable and scales databases horizontally without requiring changes to application code.

## The problem

Unlike NoSQL databases, PostgreSQL can serve `INSERT`, `UPDATE`, and `DELETE` queries from only one machine. Once the capacity of that machine is exceeded, applications have to find new and creative ways to reduce their impact on the database, like batching requests or delaying workloads to run overnight.

As the same time, database operators are faced with increasing operating costs, like behind schedule vacuums, table bloat and downtime. Incidents are frequent and engineers are more focused on not breaking the DB than building new features.


## Sharding PostgreSQL

The solution to an overextended database is **sharding**: splitting all tables and indices equally between multiple machines. For example, if your primary database is 750 GB, splitting it into 3 shards will produce 3 databases of 250 GB each. As databases get smaller, vacuums start to catch up, indices fit into memory again, and queries run faster with reliable performance.

As shards store more data and grow, they can be split again, scaling PostgreSQL horizontally. Sharded databases can grow into petabytes (that's thousands of TB), while serving OLTP and OLAP use cases.

## How PgDog works

PgDog operates on the application layer of the stack: it speaks PostgreSQL and understands not only the queries sent by applications but also the logical replication protocol used by the server. This allows it to transparently route queries while moving data between machines to create more capacity.

This documentation provides a detailed overview of all PgDog features, along with reference material for production operations.

## Read more

<div class="grid">
    <div>
        <h4><a href="/features/">Features</a></h4>
        Read more about PgDog features like load balancing, supported authentication mechanisms, TLS, health checks, and more.
    </div>
    <div>
        <h4><a href="/administration/">Administration</a></h4>
        Learn how to operate PgDog in production, like fetching real time statistics from the admin database or updating configuration.
    </div>
    <div>
        <h4><a href="/installation/">Installation</a></h4>
        Install PgDog on your Linux server or on your Linux/Mac/Windows machine for local development.
    </div>
    <div>
        <h4><a href="/configuration/">Configuration</a></h4>
        Reference for PgDog configuration like maximum server connections, number of shards, and more.
    </div>
</div>
