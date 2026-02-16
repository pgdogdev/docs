---
icon: material/memory
---

# Memory

Memory settings control buffer sizes used by PgDog for network I/O and task execution.

```toml
[memory]
net_buffer = 4096
message_buffer = 4096
stack_size = 2097152
```

### `net_buffer`

Size of the network read buffer in bytes. This buffer is used for reading data from client and server connections.

Default: **`4096`** (4 KiB)

### `message_buffer`

Size of the message buffer in bytes. This buffer is used for assembling PostgreSQL protocol messages.

Default: **`4096`** (4 KiB)

### `stack_size`

Stack size for Tokio tasks in bytes. Increase this if you encounter stack overflow errors with complex queries.

Default: **`2097152`** (2 MiB)
