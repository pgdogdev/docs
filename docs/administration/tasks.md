---
icon: material/format-list-checks
---

# Background tasks

Long-running operations like [resharding](../features/sharding/resharding/index.md) don't block the connection that started them. Instead, `RESHARD`, `COPY_DATA`, `REPLICATE`, and `SCHEMA_SYNC` each return a `task_id` and run in the background. `SHOW TASKS` is how you track those tasks: it reports their lifecycle status and progress, lets you find the `task_id` to pass to [`STOP_TASK`](#stopping-a-task) or [`CUTOVER`](../features/sharding/resharding/cutover.md), and surfaces failures.

Run it on the [admin database](index.md):

```
SHOW TASKS;
```

!!! note "Admin database tasks only"
    `SHOW TASKS` lists the background tasks running *inside this PgDog process* — the ones started by the admin database commands above. The equivalent [CLI commands](../features/sharding/resharding/index.md#running-the-steps-manually) (`pgdog data-sync`, `pgdog schema-sync`) run as a separate, one-off `pgdog` process in the foreground: they block until they finish and are stopped with `Ctrl-C`, so they neither return a `task_id` nor appear here.

=== "Output"
    ```
    -[ RECORD 1 ]+----------------------------------
     id           | 14
     scope        | root
     type         | reshard prod -> prod_sharded
     status       | running
     inner_status | syncing data
     started_at   | 2026-06-30 18:02:11.004 UTC
     updated_at   | 2026-06-30 18:05:42.119 UTC
     elapsed      | 00:03:31:115
     elapsed_ms   | 211115
    -[ RECORD 2 ]+----------------------------------
     id           |
     scope        | subtask
     type         | copy_data prod -> prod_sharded
     status       | running
     inner_status |
     started_at   | 2026-06-30 18:02:30.550 UTC
     updated_at   | 2026-06-30 18:05:42.119 UTC
     elapsed      | 00:03:11:569
     elapsed_ms   | 191569
    ```

The most recently started task is listed first.

## Columns

| Column | Description |
|-|-|
| `id` | The task's id. This is the handle you pass to [`STOP_TASK`](#stopping-a-task) and [`CUTOVER`](../features/sharding/resharding/cutover.md). Only **root** rows carry an id; subtasks share their root's id and leave this column empty. |
| `scope` | `root` for a top-level task, `subtask` for a step it spawned (e.g. the `copy_data` and `replication` steps of a `reshard`). |
| `type` | What the task is, usually with the source and destination databases — e.g. `reshard`, `copy_data`, `replication`, `replication ... (reverse)`, `schema_sync(pre)`. |
| `status` | The lifecycle status of the task. See [Statuses](#statuses). |
| `inner_status` | Fine-grained progress within the current status. See [Progress](#progress). For a finished or failed task, this keeps the last progress it reported. |
| `started_at` | When the task started. |
| `updated_at` | When the task last changed status or progress. For a terminal task this is when it finished. |
| `elapsed` / `elapsed_ms` | How long the task ran. For a terminal task this is the total run time (measured to `updated_at`), not a clock that keeps ticking. |

## Statuses

The `status` column describes where the task is in its lifecycle:

| Status | Meaning |
|-|-|
| `started` | The task is being set up. |
| `running` | The task is actively working. |
| `cancelling` | A [`STOP_TASK`](#stopping-a-task) was requested and the task is winding down cooperatively. |
| `finished` | The task completed successfully. |
| `cancelled` | The task was stopped before completing. |
| `failed: <error>` | The task errored. The error message is included in the status. |
| `panicked: <error>` | The task hit an unexpected internal error. |

`finished`, `cancelled`, `failed`, and `panicked` are **terminal**. Terminal tasks stay listed with their final status (and last progress) for a while so you can inspect the outcome, then they're pruned automatically.

## Progress

The `inner_status` column shows what the task is doing within its current `status`. The values depend on the task `type`:

| Task | Progress values |
|-|-|
| `reshard` | `syncing schema` → `syncing data` → `finalizing schema` → `replicating` |
| `copy_data` | (no sub-status; track copy progress with [`SHOW TABLE_COPIES`](../features/sharding/resharding/move.md#monitoring-progress)) |
| `replication` | `replicating` → `cutting over` (or `rolling back` for a reverse stream) / `stopping` |
| `schema_sync` | `loading schema` → `syncing tables` → `creating indexes` (or `syncing cutover schema`) |

## Finding the right id

`STOP_TASK` and `CUTOVER` always operate on the **root** `id`:

- A `RESHARD` or `COPY_DATA` shows as a `root` task with its child steps listed as `subtask` rows. Target the root id, not a subtask — subtask rows have an empty `id` on purpose.
- After a cutover, the [reverse replication](../features/sharding/resharding/cutover.md#after-the-cutover) stream appears as its own `root` task of type `replication ... (reverse)`. Use its id to [roll back](../features/sharding/resharding/cutover.md#rolling-back) (`CUTOVER <id>`) or to [finalize the migration](../features/sharding/resharding/cutover.md#finalizing-the-migration) (`STOP_TASK <id>`).

## Spotting issues

| Symptom | What to check |
|-|-|
| `status` is `failed: ...` or `panicked: ...` | Read the error message in the `status` column, then check the PgDog logs for the full context. The task is stopped; address the cause and re-run the command. |
| Task stuck at one `inner_status` for a long time | Cross-reference [`SHOW TABLE_COPIES`](../features/sharding/resharding/move.md#monitoring-progress) (during `syncing data`) and [`SHOW REPLICATION_SLOTS`](../features/sharding/resharding/move.md#streaming-updates) (during `replicating`) to see whether data is still flowing. |
| `status` is `cancelling` and not clearing | The task is draining its replication streams. A cutover that has already started runs to completion before the status settles. |
| Terminal task you expected to still be running | It reached a terminal state (`finished`/`cancelled`/`failed`). Check `inner_status` and `updated_at` to see where and when it stopped. |

## Stopping a task

Stop any running task by its root `id`:

```
STOP_TASK <task_id>;
```

This requests cancellation; the task winds down gracefully and stops appearing as `running` once it has actually stopped. For replication and copy tasks, a graceful stop also drops the replication slot the task created. See [finalizing the migration](../features/sharding/resharding/cutover.md#finalizing-the-migration) for how this is used after a cutover.
