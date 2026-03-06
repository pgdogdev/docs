---
icon: material/console
---

# Control plane

Multi-node PgDog deployments require synchronization to perform certain tasks, like atomic configuration changes, toggling [maintenance mode](../administration/maintenance_mode.md), [resharding](../features/sharding/resharding/index.md), and more. To make this work, PgDog Enterprise comes with a control plane, an application deployed alongside PgDog, to provide coordination and collect and present system telemetry.

## Architecture

The control plane and PgDog processes communicate using TCP. They exchange messages to send metrics, commands, and other metadata that allows for PgDog to transmit telemetry and the control plane to control the behavior of each PgDog process.

<center>
    <img src="/images/control_plane.png" width="75%" alt="Control plane">
</center>
