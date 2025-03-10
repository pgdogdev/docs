
# Installation

PgDog is easily compiled from source. For production deployments, a `Dockerfile` is provided in the repository. If you prefer to deploy on bare metal or you're looking to run PgDog locally, you'll need to install a few dependencies.

## Dependencies

Parts of PgDog depend on C/C++ libraries, which are compiled from source. Make sure to have a working version of a C/C++ compiler installed:

=== "Mac"
    Install [XCode](https://developer.apple.com/xcode/).

=== "Ubuntu"
    Install Clang:

    ```bash
    sudo apt update && \
    apt install -y clang build-essentials
    ```

=== "Arch"
    Install Clang:

    ```bash
    sudo pacman -S base-devel clang
    ```

=== "Windows"
    Install [Visual Studio Community Edition](https://visualstudio.microsoft.com/vs/community/).

### Rust compiler

Since PgDog is written in Rust, make sure to install the latest version of the [compiler](https://rust-lang.org).

## Build from source

PgDog source code can be downloaded from [GitHub](https://github.com/pgdogdev/pgdog):

```bash
git clone https://github.com/pgdogdev/pgdog && \
cd pgdog
```

### Compile PgDog

PgDog should be compiled in release mode to make sure you get all performance benefits. You can do this with Cargo:

```bash
cargo build --release
```

### Configuration

PgDog is [configured](configuration/index.md) via two files:

* [`pgdog.toml`](configuration/index.md) which contains general pooler settings and PostgreSQL server information
* [`users.toml`](configuration/users.toml/users.md) which contains passwords for users allowed to connect to the pooler

The passwords are stored in a separate file to simplify deployments in environments where
secrets can be safely encrypted, like Kubernetes or AWS EC2.

Both files can to be placed in the current working directory (`$PWD`) for PgDog to detect them. Alternatively,
you can specify their location when starting PgDog, using the `--config` and `--secrets` arguments.

#### Example `pgdog.toml`

Most PgDog configuration options have sensible defaults. This allows a basic primary-only configuration to be pretty short:

```toml
[general]
host = "0.0.0.0"
port = 6432

[[databases]]
name = "postgres"
host = "127.0.0.1"
```

#### Example `users.toml`

This configuration file contains a mapping between databases, users and passwords. Users not specified in this file
won't be able to connect to PgDog:

```toml
[[users]]
name = "alice"
database = "postgres"
password = "hunter2"
```

### Launch PgDog

Starting PgDog can be done by running the binary in `target/release` folder or with Cargo:


=== "Command"
    ```bash
    cargo run --release
    ```

=== "Output"
    ```
    INFO 🐕 PgDog 0.1.0
    INFO loaded pgdog.toml
    INFO loaded users.toml
    INFO loaded "pgdog_routing" plugin [1.0461ms]
    INFO 🐕 PgDog listening on 0.0.0.0:6432
    INFO new server connection [127.0.0.1:5432]
    ```

## Next steps

* [Features](features/index.md)
* [Configuration](configuration/index.md)
* [Architecture](architecture/index.md)
