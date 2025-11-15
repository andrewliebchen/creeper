# Installing Rust for Tauri Desktop App

The desktop app requires Rust to compile. Here's how to install it:

## Quick Install

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

After installation, reload your shell:
```bash
source ~/.cargo/env
```

Or restart your terminal.

## Verify Installation

```bash
rustc --version
cargo --version
```

## Install Tauri CLI

After Rust is installed:

```bash
cargo install tauri-cli --version "^2.0.0" --locked
```

**Note:** This may take 5-10 minutes on first install.

## Then Try Desktop App Again

```bash
cd desktop
pnpm tauri:dev
```

The first build will take longer as it compiles all Rust dependencies (~5-10 minutes).

