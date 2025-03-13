# PostgreSQL query protocol

Postgres has two ways to send queries to the server:

1. Simple queries
2. Extended protocol (prepared statements)

PgDog can handle both methods and can extract sharding hints from both query text and separate parameter messages.

## Simple queries

Simple queries contain everything the server needs to execute them, including query text and parameters:

```postgresql
SELECT * FROM "users" WHERE "id" = 1;
```

## Extended protocol

Extended protocol separates the query text from parameters. This allows the client to send the query text once and execute it multiple times using different parameter values:

```postgresql
SELECT * FROM "users" WHERE "id" = $1;
```

Parameter values are substituted with numbered placeholders. Values are sent in a separate protocol message.
