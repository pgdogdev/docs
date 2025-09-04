# Mirroring

[Mirroring](../../features/mirroring.md) settings configure traffic mirroring between two databases. When enabled, query traffic is copied from the source database to the destination database, in real time.

For example:

```toml
[[mirroring]]
source_db = "source"
destination_db = "dest"
queue_depth = 500
exposure = 0.1
```

### `source_db`

Name of the source database to mirror traffic from. This should be a `name` configured in the
[`databases`](./databases.md) section of `pgdog.toml`.

Default: **none** (required)

### `destination_db`

Name of the destination database to mirror traffic to. This should be a `name` configured
in the [`databases` ](./databases.md) section of `pgdog.toml`.

Default: **none** (required)

### `queue_depth`

The length of the queue to provision for mirrored transactions. See [mirroring](../../features/mirroring.md) for more details. This overrides the [`mirror_queue`](./general.md#mirror_queue) setting.

Default: **none** (optional)

### `exposure`

The percentage of transactions to mirror, specified as a floating point number between 0.0 and 1.0. See [mirroring](../../features/mirroring.md) for more details. This overrides the [`mirror_exposure`](./general.md#mirror_exposure) setting.

Default: **none** (optional)
