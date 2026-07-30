---
icon: material/backup-restore
---

# Crash recovery

!!! note "New feature"
    This feature is new and experimental. Please make sure to test it before
    deploying to production and let us know if you run into any issues.

[Two-phase commit](index.md) requires different state to be stored on each shard during the commit phase. If PgDog were to crash during this step, it would be impossible to determine the state of each transaction on each shard.

To avoid this, PgDog can write the commit state of each two-phase transaction into its own write-ahead log (WAL). When it's restarted, PgDog reads from the log and restores the 2PC state to what it was, allowing it to finish any in-flight transactions.

## How it works

The WAL requires PgDog to run on a machine with a durable storage medium. If you're using our [Helm chart](../../../installation.md#kubernetes), you can enable this directly in the chart:

```yaml title="values.yaml"
statefulSet:
  enabled: true
  walPvc:
    enabled: true
```

The `walPvc` flag will provision a Persistent Volume Claim (PVC) and attach its own volume to each replica in the deployment. It will also configure the necessary [`pgdog.toml`](../../../configuration/pgdog.toml/general.md) settings:

=== "pgdog.toml"
    ```toml
    [general]
    two_phase_commit_wal_dir = "/var/lib/pgdog/wal"
    ```
=== "Helm chart"
    ```yaml
    # This is configured automatically.
    twoPhaseCommitWalDir: "/var/lib/pgdog/wal"
    ```

Our WAL has no Kubernetes dependency, so you can use it if you're deploying PgDog anywhere else, as long as you have a durable disk, e.g., EBS volume, SSD, etc.

### Configuration

The WAL has a couple of settings that allow you to tweak its performance:

| Setting | Description |
|-|-|
| `two_phase_commit_wal_fsync_interval` | Wait this long (in ms, **0** by default) before calling `fsync` on a group of WAL records written to the log. |
| `two_phase_commit_wal_checkpoint_interval` | How often the checkpointer runs (in ms, **15 seconds** by default) to remove unnecessary WAL segments. |
| `two_phase_commit_wal_segment_size` | The size of each WAL segment, in bytes. The default, **16MB**, is usually good enough. |

The default settings are usually optimal for most deployments. The fsync interval allows you to optimize WAL disk performance in highly concurrent scenarios, e.g., thousands of clients
executing 2PC transactions concurrently.

## Architecture

PgDog's write-ahead log architecture is loosely based on Postgres, with some differences. Like Postgres, PgDog implements it using three independent components:

| Component | Description |
|-|-|
| [WAL writer](#wal-writer) | Background task responsible for writing records to WAL segments (files). |
| [Checkpointer](#checkpointer) | Background task responsible for removing old WAL segments no longer necessary for recovery. |
| [Recovery](#recovery) | Foreground task that runs on PgDog startup and replays the WAL to restore its in-memory state to a consistent point. |

### WAL writer

The WAL writer is a background task (we are using Tokio under the hood), which is responsible for writing data into the write-ahead log. It receives records from clients via a synchronization primitive (a queue) and writes them to disk, in batches.

Once written, the WAL writer sends a signal back to each client notifying them that their transaction state is safe on disk, and they can proceed. The clients then execute the transaction control statements against the Postgres shards themselves (e.g., `PREPARE TRANSACTION`, `COMMIT PREPARED`).

If PgDog were to crash at any time, the state of each transaction can be restored from disk and the transaction control statements replayed against the Postgres shards, either rolling back or committing a two-phase transaction.

#### WAL segments

The write-ahead log is split into segments, i.e., individual files on disk. This allows the [checkpointer](#checkpointer) to remove segments that contain data PgDog no longer needs, e.g., transactions that have long been committed to Postgres.

By default, PgDog's segment size is **16MB**, just like Postgres. This ensures that we don't have to rotate (create) new segments frequently, while minimizing the amount of data we have to read during [recovery](#recovery). You can change this with configuration:

=== "pgdog.toml"
    ```toml
    [general]
    two_phase_commit_wal_segment_size = 16777216
    ```
=== "Helm chart"
    ```yaml
    twoPhaseCommitWalSegmentSize: 16777216
    ```

##### Segment size

The segments are rotated asynchronously by a background task. This is one key difference between PgDog's implementation and Postgres: the segment size isn't guaranteed. While the rotation takes place, in-flight transaction state is written to the previous segment. This removes the need for us to _lock_ the WAL during a write, i.e., implementing our own version of `WALWriteLock`.

#### Partial records

All of our WAL segments contain complete records. This makes [recovery](#recovery) easier, but also contributes to the variable [segment size](#segment-size).

### Checkpointer

The checkpointer is a background task that runs in a loop and removes any WAL segments that are no longer needed for [recovery](#recovery). These segments contain 2PC stages for transactions that have already been fully committed to Postgres.

Unlike the Postgres checkpointer which needs to update data files to do its job, PgDog's checkpointer only needs to delete unused WAL segments. This makes it very fast. It runs on a regular interval, configurable in [`pgdog.toml`](../../../configuration/pgdog.toml/general.md):

=== "pgdog.toml"
    ```toml
    [general]
    two_phase_commit_wal_checkpoint_interval = 15_000
    ```
=== "Helm chart"
    ```yaml
    twoPhaseCommitWalCheckpointInterval: 15_000
    ```

### Recovery

The recovery process's job is to read all available WAL segments and replay their data into the in-memory state of the [2PC](index.md#error-handling) transaction manager. Once the replay is complete, the manager state should be restored to what it was prior to the crash.

The recovery process runs on PgDog startup and will block it until it's complete. Clients will not be able to connect until recovery is complete. Just like the [checkpointer](#checkpointer), it only needs to read WAL segments into memory and doesn't perform any writes to disk, so it's very quick.
