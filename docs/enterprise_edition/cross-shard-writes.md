---
icon: material/database-edit
---

# Cross-shard writes

!!! note "On the roadmap"
    This feature is still on the [roadmap](index.md#roadmap) and
    hasn't been built yet.

Queries that create or update rows on multiple shards should be using [two-phase](../features/sharding/2pc.md) transactions. This ensures that table changes are atomic in all databases. The open source edition of PgDog supports this feature out of the box.

The Enterprise edition provides crash protection, in case PgDog itself is restarted or the hardware its running on fails, while in between phase one and phase two of the exchange. This guarantees all two-phase transactions are either committed or rolled back.

## How it works

Two-phase transactions are durable database objects. Once prepared, a 2pc transaction needs to be either committed or rolled back. If this doesn't happen, PostgreSQL won't be able to vacuum affected tables. If left unattended for a long period of time, this will cause a database shutdown.

### Durable two-phase

PgDog Enterprise nodes register each two-phase transaction with the [control plane](control_plane/index.md). When a PgDog process boots up, it will fetch all of its abandoned transactions from the control plane storage, and proceed to clean them up before serving query traffic.

<center>
    <img src="/images/ee/2pc_storage.png" width="70%" alt="Reload schema">
</center>

The transaction identifiers and their state are saved in a separate PostgreSQL database. This provides a safety guarantee against control plane crashes as well.

## Status

This feature isn't built yet. We're planning on shipping it in Q2 2026.
