#!/usr/bin/env python
import argparse
import sys

from .__init__ import __version__
from .plotcritic import plotcritic, default_question, default_report_fields


def key_val(arg):
    return [str(x) for x in arg.split(':')]

def setup_args():
    parser = argparse.ArgumentParser(
        description="Deploy a website for image curation",
        prog="plotcritic",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument('-p', "--project", 
        help="Unique name for the project",
        required=True
    )
    parser.add_argument('-q', "--curation_question", 
        help="The curation question to show in the PlotCritic website. Default: " + default_question
    )
    parser.add_argument('-A', "--curation_answers", 
        help="colon-separated key,values pairs of 1-letter codes and associated " + 
        "curation answers for the curation question (i.e: 'key1','value1' 'key2','value2'). " +
        'Default (based on default question): "s":"Supports" "n":"Does not support" "d":"De novo"',
        type=key_val, 
        nargs="+"
    )
    parser.add_argument('-R', "--report_fields",
        help="space-separated list of fields about the image, for sample identification and additional information. " + 
        "Default values (based on the genomic structural variant scoring) are: " + ", ".join(default_report_fields),
        nargs="+",
        default=default_report_fields
    )
    parser.add_argument('-S', "--summary_fields",
        help="subset of the report fields that will be shown in the web report after scoring. Space-separated. ",
        nargs="+",
        required=True
    )
    parser.add_argument('-i', "--images_dir",
        help="directory of images and metadata files for curation",
        required=True
    )

    return parser



def main():
    print("\nPLOTCRITIC v{}".format(__version__), file=sys.stderr)

    parser = setup_args()
    args = parser.parse_args()
    args.func(parser, args)
    plotcritic(args)


if __name__ == "__main__":
    sys.exit(main() or 0)
