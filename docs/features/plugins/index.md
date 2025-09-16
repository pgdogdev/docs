---
icon: material/power-plug
---
# Plugins overview

PgDog comes with a powerful plugin system that allows you to customize the query routing behavior. Plugins are written in Rust, compiled into shared libraries, and loaded at runtime.


## Getting started

#### Rust compiler
Our plugins use the newest features of the Rust compiler. Before proceeding, make sure to update yours to the latest version:

```
rustup update
```

#### Building a plugin

PgDog plugins are Rust libraries. To create a plugin, first create a project with Cargo:

```
cargo init --lib my_plugin
```

#### Dependencies

Inside your project's `Cargo.toml`, add the following settings and dependencies:

```toml
[lib]
crate-type = ["rlib", "cdylib"]

[dependencies]
pgdog-plugin = "0.1.6"
```

This turns the crate into a shared library, exposing its functions using the C ABI, which PgDog will call at runtime.

!!! note
    The `pgdog-plugin` crate is published on [crates.io](https://crates.io/crates/pgdog-plugin) and is fully documented. You can find our [Rust docs here](https://docsrs.pgdog.dev), including all dependencies like [`pg_query`](https://docsrs.pgdog.dev/pg_query/index.html).

### Writing plugins

When writing plugins, it's helpful to import most commonly used macros, functions and types. You can do so with just one line of code:

```rust
use pgdog_plugin::prelude::*;
```

PgDog plugins have a list of required methods they need to expose. They are called by PgDog at plugin startup and validate that it
was correctly written.

You don't need to implement them yourself. Add the following to your plugin's `src/lib.rs` file:

```rust
macros::plugin!();
```

These ensure the following requirements are followed:

1. The plugin is compiled with the same version of the Rust compiler as PgDog itself
2. They are using the same version of `pg_query`

See [Safety](#safety) section for more info.


## Functions

### `init`

This function is executed once at startup, when PgDog loads the plugin. It allows to initialize any
kind of internal plugin state. Execution of this function is synchronized, so it's safe to include any thread-unsafe
functions or initialize synchronization primitives, like mutexes.


This function has the following signature:

```rust
#[init]
fn init() {
    // Perform any initialization routines here.
}
```


### `route`

This function is called every time the query router processes a query and needs to figure out
where this query should be sent.

This function has the following signature:

```rust
#[route]
fn route(context: Context) -> Route {
    Route::unknown()
}
```

#### Inputs

The [`Context`](https://docsrs.pgdog.dev/pgdog_plugin/context/struct.Context.html) struct provides the following information:

- Number of shards in the database cluster
- Does the cluster have replicas
- The Abstract Syntax Tree (AST) of the statement, parsed by `pg_query`
- Parameter values, if statement is prepared


#### Outputs

The plugin is expected to return a [`Route`](https://docsrs.pgdog.dev/pgdog_plugin/context/struct.Route.html). It can pass the following information back to PgDog:

- Which shard(s) to send the query to
- Is the query a read or a write, sending it to a replica or the primary, respectively
- Should the query be blocked from executing

All of these are optional. If you don't return either one, the plugin doesn't influence the routing decision at all and can be used for logging queries, or some other purpose.



### `fini`

This function is called before PgDog is shut down. It allows plugins to perform any cleanup tasks, like saving
some internal state to a durable medium.

This function has the following signature:

```rust
#[fini]
fn fini() {
    // Any cleanup routines go here.
}
```

## Loading plugins

Plugins need to be compiled and placed into a folder on your machine where PgDog can find them. This can be achieved using several approaches:

1. Place the shared library into a standard operating system folder, e.g.: `/usr/lib` or `/lib`
2. Export the plugin's parent directory into the `LD_LIBRARY_PATH` environment variable, provided to PgDog at runtime
3. Pass the absolute (or relative) path to the plugin in [`pgdog.toml`](../../configuration/pgdog.toml/plugins.md)

!!! note
    Make sure to compile plugins in release mode for good performance: `cargo build --release`. The plugin's shared library will be in `target/release` folder of your Cargo project, e.g., `target/release/libmy_plugin.so`.

You then need to specify which plugins you'd like PgDog to load at runtime:

```toml
[[plugins]]
name = "my_plugin"
```

This can be the name of the library (without the `lib` prefix or the `.so`/`.dylib` extension) or relative/absolute path to the shared library, for example:

```toml
[[plugins]]
name = "/usr/lib/libmy_plugin.so"
```

## Examples

Example plugins written in Rust are in [GitHub](https://github.com/pgdogdev/pgdog/tree/main/plugins).

## Safety

Rust plugins can do anything. There is no virtualization layer or checks on their behavior. With great power comes great responsibility, so make sure the plugins you use are trusted (and tested).

This is intentional. We don't want to limit what you can do inside plugins nor are we there to tell you what you shouldn't be doing. It's your data stack, and you're the owner.

An additional benefit of using Rust is: plugins are very fast! If written correctly, they will have minimal to no latency impact on your database.

### Rust/C ABI

Unlike C, the Rust language doesn't have a stable ABI. Therefore, additional care needs to be taken when loading and executing routines from shared libraries. This is enforced automatically by `pgdog-plugin`, but you should still be aware of them.

#### Rust compiler version

Whatever Rust compiler version is used to build PgDog itself needs to be used to build the plugins. This is checked at runtime and plugins that don't follow this requirement are **not loaded**.

PgDog provides the compiler version used to build it at startup:

```
INFO: 🐕 PgDog vd4e9bc6 (rustc 1.89.0 (29483883e 2025-08-04))
```

#### `pg_query` version

Since we're passing the AST itself down to the plugins, we need to make sure that the versions of the `pg_query` library used by PgDog and the plugin are the same. This is done automatically if you're using the primitives exported by the `pgdog-plugin` crate:

```rust
// Manually use the exported primitives.
use pgdog_plugin::pg_query;

// Automatically import them.
use pgdog_plugin::prelude::*;
```
