# PgDog Documentation

This repository contains the documentation hosted on [https://docs.pgdog.dev](https://docs.pgdog.dev).

## Contributions

Contributions are welcome. Please open a pull request / issue with requested changes. Once the PR is merged,
you should see changes in production within a few minutes.

## Regenerating `llms.txt`

The LLM-friendly documentation index is generated from the Markdown sources with
[Sourcey](https://sourcey.com). After changing the documentation, regenerate it
with Node.js and Python installed:

```bash
python3 scripts/generate_llms.py
```

The script pins the Sourcey version and updates `docs/llms.txt` only when the
generated output changes. Commit the updated file together with the documentation
changes.
