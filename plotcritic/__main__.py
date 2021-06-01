#!/usr/bin/env python
import argparse
import sys

from .__init__ import __version__
from .plotcritic import plotcritic, samplot_report_fields, samplot_summary_fields


def key_val(arg):
    return [str(x) for x in arg.split(':')]

def setup_args():
    parser = argparse.ArgumentParser(
        description="Deploy a website for image curation",
        prog="plotcritic",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument('-p', "--project", 
        help="Unique name for the project",
        required=True,
    )
    parser.add_argument('-i', "--images_dir",
        help="directory of images and metadata files for curation",
        required=True,
    )
    parser.add_argument('-s', "--use_samplot_defaults",
        help="Use samplot-oriented default reporting_fields and summary_fields. "
            + "Ignores `--summary_fields` and `--reporting_fields`."
            + "\nDefault reporting fields: " + ", ".join(samplot_report_fields)
            + "\nDefault summary fields: " + ", ".join(samplot_summary_fields),
        action="store_true",
    )
    parser.add_argument('-q', "--curation_question", 
        help="The curation question to show in the PlotCritic website.",
        required=True,
    )
    parser.add_argument('-A', "--curation_answers", 
        help="colon-separated key,values pairs of 1-letter codes and associated " + 
        "curation answers for the curation question (i.e: 'key1','value1' 'key2','value2').",
        type=key_val, 
        nargs="+",
        required=True,
    )
    parser.add_argument('-R', "--report_fields",
        help="space-separated list of info fields about the image. "
            + "If omitted, only the image name will be included in report",
        nargs="+",
    )
    parser.add_argument('-S', "--summary_fields",
        help="subset of the report fields that will be shown in the web report after scoring."
            + "Space-separated. If omitted, only the image name will be included in report",
        nargs="+",
    )
    

    return parser



def main():
    print("\nPLOTCRITIC v{}".format(__version__), file=sys.stderr)

    parser = setup_args()
    plotcritic(parser)


if __name__ == "__main__":
    sys.exit(main() or 0)
