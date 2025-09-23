#!/usr/bin/env python3

import glob
import re
import subprocess
from markdown_it import MarkdownIt
import sys

from regex import sub
from regex.regex import Regex, RegexFlag
mdp = MarkdownIt()

pattern = re.compile(r'(?msi)^(?P<fence>[`~]{3,})[ \t]*toml\b[^\n]*\r?\n(?P<code>.*?)^(?P=fence)[ \t]*\r?$',)

def verify(binary):
    for file in glob.glob("docs/**/*.md",
        recursive=True):
        with open(file, "r") as f:
            content = f.read()
            print(f"Checking {file}")
            tokens = mdp.parse(content)
            for token in tokens:
                if token.type == "fence" and token.info == "toml":
                    if "[[users]]" in token.content:
                        check_file(binary, "users", token.content)
                    elif "[lib]" in token.content:
                        pass
                    else:
                        check_file(binary, "pgdog", token.content)

def check_file(binary, kind, content):
    tmp = f"/tmp/pgdog_config_test.toml"
    with open(tmp, "w") as f:
        f.write(content)
    if kind =="users":
        arg = "--users"
    else:
        arg = "--config"
    result = subprocess.run([binary, arg, "/tmp/pgdog_config_test.toml", "configcheck"])
    if result.returncode != 0:
        print(f"{content}")
        print(result.stderr)
        exit(1)

if __name__ == "__main__":
    verify(sys.argv[1])
