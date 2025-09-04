# Mirroring

Mirroring settings configure a mirroring setup between two databases. This causes traffic to be copied to the destination database for testing purposes: More details on [mirroring](../../features/mirroring.md)

```toml
[[mirroring]]
source_db = "source"
destination_db = "dest"
queue_depth = 500 # optional, overrides global setting
exposure = 0.1 # optional, overrides global setting
```

### `source_db`

Name of the source database. This should be a `name` set up in
[the `databases` section of the configuration.](./databases.md)

Default: **none** (required)

### `destination_db`

Name of the destination database. This should be a `name` set up
in [the `databases` section of the configuration.](./databases.md)

Default: **none** (required)

### `queue_depth`

The length of the queue to provision. See [mirroring](../../features/mirroring.md) for more details. This overrides the [general](./general.md) setting `mirror_queue`

Default: **none** (optional)

### `exposure`

The percent of transactions to mirror, as a floating point number between 0.0 and 1.0 . See [mirroring](../../features/mirroring.md) for more details. This overrides the [general](./general.md) setting `mirror_exposure`

Default: **none** (optional)