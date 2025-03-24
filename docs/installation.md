
# Installation

## Kubernetes

PgDog comes with its own [Helm chart](https://github.com/pgdogdev/helm). You can install it from git:

```bash
git clone https://github.com/pgdogdev/helm pgdog-helm && \
cd pgdog-helm &&
helm install -f values.yaml pgdog ./
```

## Docker

Docker images are built automatically for each commit in GitHub. You can fetch them directly from the [repository](https://github.com/pgdogdev/pgdog/pkgs/container/pgdog):

```bash
docker run ghcr.io/pgdogdev/pgdog:main
```

## From source

PgDog is easily compiled from source. For production deployments, a `Dockerfile` is provided in the [repository](https://github.com/pgdogdev/pgdog/tree/main/Dockerfile). If you prefer to deploy on bare metal or you're looking to run PgDog locally, you'll need to install a few dependencies.

### Dependencies

Parts of PgDog depend on C/C++ libraries, which are compiled from source. Make sure to have a working version of a C/C++ compiler installed.

#### Mac OS

Install [XCode](https://developer.apple.com/xcode/) from the App Store and CMake from brew:

```bash
brew install cmake
```

#### Ubuntu

Install Clang and CMake:

```bash
sudo apt update && \
apt install -y clang build-essential cmake
```

#### Arch Linux

Install Clang and CMake:

```bash
sudo pacman -Syu base-devel clang cmake
```

#### Windows

Install [Visual Studio Community Edition](https://visualstudio.microsoft.com/vs/community/).
Make sure to include CMake in the installation.

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
you can specify their location when starting PgDog, using the `--config` and `--users` arguments:

```bash
./target/release/pgdog \
    --config /path/to/pgdog.toml \
    --users path/to/users.toml
```

#### Example `pgdog.toml`

Most PgDog configuration options have sensible defaults. This allows a basic, single database configuration, to be pretty short:

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

```bash
cargo run --release
```

## Next steps

<div class="grid">
    <div>
        <h4><a href="/features/">Features</a></h4>
        <p>Read more about PgDog features like load balancing, supported authentication mechanisms, TLS, health checks, and more.</p>
    </div>
    <div>
        <h4><a href="/administration/">Administration</a></h4>
        <p>Learn how to operate PgDog in production, like fetching real time statistics from the admin database or updating configuration.</p>
    </div>
    <div>
        <h4><a href="/architecture/">Architecture</a></h4>
        <p>Read about PgDog internals and how it works under the hood.</p>
    </div>
    <div>
        <h4><a href="/configuration/">Configuration</a></h4>
        <p>Reference for PgDog configuration like maximum server connections, number of shards, and more.</p>
    </div>
</div>
