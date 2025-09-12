# Pub/sub

!!! note
    This feature is new and experimental. Please [report](https://github.com/pgdogdev/pgdog/issues) any issues you may run into.

Postgres has native support for pub/sub through [`LISTEN`](https://www.postgresql.org/docs/current/sql-listen.html) and [`NOTIFY`](https://www.postgresql.org/docs/current/sql-notify.html) commands. If you're not familiar, pub/sub stands for publish/subscribe and allows you to send and listen for arbitrary messages, in real time, by using Postgres as the message broker.

Historically, this feature was only available to clients who connect to Postgres directly.
PgDog supports this in [transaction mode](transaction-mode.md), removing this limitation. You can use `LISTEN` and `NOTIFY`, as if you're connected directly to Postgres, with thousands of clients.

## How it works

You can enable pub/sub support by configuring the asynchronous message channel size in [`pgdog.toml`](../configuration/pgdog.toml/general.md):

```toml
[general]
pub_sub_channel_size = 4096
```

Clients can then use Postgres pub/sub like normal. PgDog will intercept all commands and process them internally. How each command is handled is described below.


<center>
  <img src="/images/pub_sub.png" width="90%" height="auto" alt="Pub/sub">
</center>


### `LISTEN`

When PgDog receives a `LISTEN channel` command, it will register itself with Postgres on the requested channel, on the client's behalf. It does that over a dedicated server connection. If multiple clients request to listen on the same channel, PgDog will register itself only once.

### `NOTIFY`

When PgDog receives a `NOTIFY channel, payload` command, it will place it into an asynchronous queue and forward it to Postgres over a dedicated connection. This ensures that multiple instances of PgDog all receive the notification.

Once Postgres sends the notification back, PgDog will fan it out to all registered clients. If you have thousands of listeners, sending them a message is cheap since it's handled by a [Tokio](https://docs.rs/tokio/latest/tokio/sync/broadcast/index.html) `broadcast` channel and not by Postgres.

#### Transactions

PgDog respects transactional guarantees offered by Postgres for notifications. If a notification is sent inside a transaction, it will be buffered until the transaction is committed and, only then, sent to Postgres.

If the transaction is rolled back or has an error, buffered notifications are dropped.

!!! note
    This feature protects clients from sending `NOTIFY` commands to Postgres inside transactions, which has a [known](https://news.ycombinator.com/item?id=44490510) performance problem.

### `UNLISTEN`

`UNLISTEN channel` removes the client from the list of clients interested in messages sent to that channel. It won't receive any more notifications, but PgDog continues to listen for them until all clients have unsubscribed or disconnected.

Once that happens, PgDog will send the `UNLISTEN channel` command to Postgres automatically.

### Trade-offs

Since PgDog handles all commands, clients will get an immediate acknowledgement as soon as it processes a command. However, it doesn't mean that the command is immediately executed. If the backlog is large, it could take a few milliseconds for a command to be forwarded to Postgres.

The size of the backlog is controlled with the `pub_sub_channel_size` setting. Once the queue is full, clients will begin to wait until the commands are processed.

#### Delivery guarantees

`LISTEN` and `UNLISTEN` messages are guaranteed to be delivered. A client will, eventually, start receiving notifications on a channel. If there are a lot of requests in the queue, this may take a little while (a few milliseconds, typically).

A `NOTIFY` message can be lost if the dedicated connection to Postgres is broken. PgDog will not attempt re-delivery for a message on connection error. This is done to avoid duplicate notifications.

If this happens, PgDog will attempt to re-establish the connection immediately. All subsequent messages will be delivered over the new connection.
