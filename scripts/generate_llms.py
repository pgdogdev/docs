#!/usr/bin/env python3
"""Regenerate docs/llms.txt with the pinned Sourcey release."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "docs" / "sourcey.config.ts"
OUTPUT = ROOT / "docs" / "llms.txt"
SOURCEY_VERSION = "3.6.5"


def main() -> None:
    npx = "npx.cmd" if os.name == "nt" else "npx"

    with tempfile.TemporaryDirectory(prefix="pgdog-sourcey-") as directory:
        generated_dir = Path(directory)
        subprocess.run(
            [
                npx,
                "--yes",
                f"sourcey@{SOURCEY_VERSION}",
                "build",
                "--config",
                str(CONFIG),
                "--output",
                str(generated_dir),
            ],
            cwd=ROOT,
            check=True,
        )

        generated = generated_dir / "llms.txt"
        if not generated.is_file():
            raise RuntimeError(f"Sourcey did not create {generated}")

        if OUTPUT.is_file() and OUTPUT.read_bytes() == generated.read_bytes():
            print(f"{OUTPUT.relative_to(ROOT)} is already up to date")
            return

        shutil.copyfile(generated, OUTPUT)
        print(f"Updated {OUTPUT.relative_to(ROOT)} with Sourcey {SOURCEY_VERSION}")


if __name__ == "__main__":
    main()
