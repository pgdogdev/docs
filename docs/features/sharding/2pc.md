---
icon: material/check-all
---
# Two-phase commit

!!! note
     This feature is new and experimental. Please [report](https://github.com/pgdogdev/pgdog/issues) any issues you may run into.

Two-phase commit takes advantage of [prepared transactions](https://www.postgresql.org/docs/current/sql-prepare-transaction.html) in Postgres to provide eventually consistent cross-shard writes. When enabled, transactions spanning multiple shards have a very high chance of being atomic.

This feature is also known as **2pc** or **2-phase** transactions.

<center style="margin-top: 2rem;">
    <img src="/images/2pc.png" width="98%" alt="Cross-shard queries" />
</center>

## How it works

When two-phase commit is enabled, PgDog keeps track of all write transactions in its built-in transaction manager.

Upon receiving a `COMMIT` command, it automatically rewrites it to use `PREPARE TRANSACTION` and `COMMIT PREPARED` statements. Once the 2-phase exchange is complete, PgDog lets the client know the transaction is committed. This happens under the hood, unbeknownst to the application.

### Configuration

To enable two-phase commit, first enable prepared transactions on all Postgres databases by setting the `max_prepared_transactions` parameter to a value greater than 0. If you have access to a superuser, you can run the following command:

```postgresql
ALTER SYSTEM SET max_prepared_transactions TO 1000;
```

Alternatively, if you're running on managed Postgres (e.g., AWS RDS), this parameter can usually be set through your cloud admin panel.

!!! note
     This parameter can only be enabled on server start. Once you change it, make sure to restart your Postgres servers.

Once prepared transactions are enabled in Postgres, two-phase commit can be enabled in [`pgdog.toml`](../../configuration/pgdog.toml/general.md):

```toml
[general]
two_phase_commit = true
```

### Error handling

Two-phase transactions make it reasonably safe to write to multiple databases atomically. It works by separating the commit step into two phases:

| Phase | Description | Error |
|-|-|-|
| Phase 1 | The transaction is prepared in advance on all Postgres servers. | Automatic rollback |
| Phase 2 | The transaction is committed to all Postgres servers. | Automatic commit |

If an error happens before or during **phase 1**, the transaction will be **rolled back** automatically. None of the other clients will see the data written by it at any time. The rollback process happens asynchronously, while the client that started the transaction receives an error.

If an error happens during **phase 2**, the transaction is automatically **committed**. This happens asynchronously as well, and while this process is usually very quick, clients may see partial updates to the shards until it's finished.

Separating the commit step into two phases protects against network-related errors or database crashes that may happen while the transaction is written to individual shards. You can think of it as a cross-shard write-ahead log for transactions.

#### Consistency guarantees

Two-phase commit provides an _eventual consistency_ guarantee only. While the transaction is committed, even if no errors occur, other clients will be able to see partial updates to the database cluster.

## Automatic 2pc

All Postgres statements run inside transactions. If not explicitly started using the `BEGIN` command, Postgres will start and commit a transaction for each query it executes.

Therefore, it's common for applications not to use explicit transactions at all to perform single-statement writes. If the statement needs to write to multiple shards, two-phase commit is still necessary to make it atomic.

PgDog is able to detect such scenarios and will start and commit a two-phase transaction automatically. For example, if your application sends a write statement, like so:

```postgresql
UPDATE users SET admin = true WHERE created_at < NOW();
```

PgDog will automatically rewrite it to use a two-phase transaction:

```postgresql
-- start multi-statement transaction
BEGIN;

UPDATE users SET admin = true WHERE created_at < NOW();

-- two-phase commit
PREPARE TRANSACTION '<unique ID>';
COMMIT PREPARED '<unique ID>';
```

This feature allows for easier migrations to sharded databases, without requiring engineers to rewrite their application code to use transactions.

### Configuration

While it's often desirable to ensure cross-shard writes are atomic, rewriting single-statement transactions to use 4 statements has some performance overhead. For this reason, this feature is **disabled** by default.

If your writes are idempotent and can be safely retried, or your application doesn't have consistency requirements, you don't need to use this. Otherwise, you can enable it in [`pgdog.toml`](../../configuration/pgdog.toml/general.md):

```toml
[general]
two_phase_commit_auto = true
```

## Reads

Two-phase commit is used for writes only. Read transactions are finished using normal `COMMIT` statements. Just like cross-shard writes, reads are eventually consistent and cross-shard transactions may see partial updates while direct-to-shard or cross-shard transactions are being executed.

## Read more

- [Omnisharded tables](omnishards.md)
- [Cross-shard queries](cross-shard-queries/index.md)
