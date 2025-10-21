# Real-time metrics

PgDog EE collects and sends its own metrics to the Dashboard. This provides a real-time view into PgDog internals, without a delay that's typically present in other minotoring solutions.

## How it works


Since metrics are just integers, they can be serialized and sent quickly and efficiently, via a dedicated connection, to the Dashboard.

Real time metrics are pushed down to the web UI via a WebSocket connection. Meanwhile, per-minute aggregates are collected and stored in a dedicated database.
