#!/usr/bin/env python
import argparse
import sys

from .__init__ import __version__
from .plotcritic import add_create


def main(args=None):
    if args is None:
        args = sys.argv[1:]

    parser = argparse.ArgumentParser(
        prog="plotcritic", formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument(
        "-v",
        "--version",
        help="Installed version",
        action="version",
        version="%(prog)s " + str(__version__),
    )
    sub = parser.add_subparsers(title="[sub-commands]", dest="command")
    sub.required = True

    add_create(sub)

    args = parser.parse_args(args)
    args.func(parser, args)


if __name__ == "__main__":
    sys.exit(main() or 0)
