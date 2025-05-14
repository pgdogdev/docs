# Multi-tenancy

!!! note
    This is a new experimental feature. Feedback welcome.

PgDog can enforce the use of a specific column on all queries to make sure your apps are not breaking tenant isolation rules.

### How it works

Since PgDog is parsing SQL, it can read the query to detect the use of specific columns. For example:

```postgresql
SELECT * FROM users
WHERE tenant_id = $1
```

This query filters on `tenant_id` and can be allowed through, while a query that doesn't can be blocked. Currently, the rules for tenant detection are the same as [sharding](sharding/index.md):

- Equality between `tenant_id` and a value
- `tenant_id IS NOT NULL` as a special case

### Configuration

This feature can be enabled through configuration:

```toml
[multi_tenant]
column = "tenant_id"
```
