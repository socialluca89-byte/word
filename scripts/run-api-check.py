#!/usr/bin/env python3
"""Keep API regression output/exit status and publish a value-free CI location."""
from pathlib import Path
import os
import re
import subprocess
import sys


def failure_location(output, script):
    location = script
    for source, line in re.findall(r'File "([^"]+)", line ([0-9]+)', output):
        if Path(source).name == Path(script).name:
            location = script + ':' + line
    kinds = re.findall(r'^(\w*(?:Error|Exception)|SystemExit)(?::|$)', output, re.M)
    return location, kinds[-1] if kinds else 'unspecified failure'


def main():
    if len(sys.argv) != 2 or not re.fullmatch(r'scripts/test-[a-z0-9-]+\.py', sys.argv[1]):
        raise SystemExit('Usage: run-api-check.py scripts/test-name.py')
    script = sys.argv[1]
    if script == 'scripts/test-read-only-readiness.py':
        runtime = subprocess.run([os.environ.get('PHP_COMMAND', 'php'), '-r', 'echo PHP_VERSION;'],
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        version = runtime.stdout if re.fullmatch(r'[a-zA-Z0-9.+-]{1,50}', runtime.stdout) else 'unavailable'
        print('::notice title=API runtime::Read-only readiness PHP ' + version + '.', flush=True)
    result = subprocess.run([sys.executable, script], stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, text=True)
    print(result.stdout, end='', flush=True)
    if result.returncode:
        location, kind = failure_location(result.stdout, script)
        # Only fixed script identifiers, numeric lines and exception class names:
        # never copy fixture responses, credentials or exception values to notices.
        print('::error title=API regression::' + script + ' failed with exit ' +
              str(result.returncode) + '; source ' + location + '; ' + kind + '.', flush=True)
    else:
        print('::notice title=API regression::' + script + ' passed.', flush=True)
    return result.returncode if result.returncode >= 0 else 128 - result.returncode


if __name__ == '__main__':
    raise SystemExit(main())
