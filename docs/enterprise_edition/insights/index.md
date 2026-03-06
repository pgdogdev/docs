---
icon: material/lightbulb-on
---

# Query insights

PgDog Enterprise provides visibility into all queries that it serves, which allows it to analyze and report how those queries perform, in real-time.

## Telemetry

PgDog Enterprise collects the following telemetry:

| Telemetry | Frequency | Description |
|-|-|-|
| [Active queries](active_queries.md) | real time | Queries actively executing through the proxy. |
| [Query plans](query_plans.md) | sample / threshold | Query plans (`EXPLAIN` output) are collected for slow queries and sampled queries automatically. |
| [Query statistics](statistics.md) | real time | Query duration, number of rows returned, idle-in-transaction time, and errors. |

This data is transmitted to the [control plane](../control_plane.md) in real-time, which makes it available via its web dashboard.
