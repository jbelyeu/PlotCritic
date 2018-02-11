#! /usr/bin/env python
from __future__ import print_function
# Python 2/3 compatibility
import sys
import os
import argparse
import json

def key_val(arg):
    return [str(x) for x in arg.split(':')]

def is_number(string):
    try:
        int(string)
        return True
    except ValueError:
        return False

parser = argparse.ArgumentParser(description="Creates metadata files in .json format for a directory of image files")
parser.add_argument("-d", "--images_directory", 
    help="directory containing image files that need metadata",
    required=True
)
parser.add_argument("-c", "--config", 
    help="directory containing image files that need metadata",
    required=True
)
parser.add_argument("-a", "--annotation_file",
    help="file containing metadata for the .json files. " + 
    "Can be comma or tab-separated. " +
    "Each entry should be on one line and the first field should be the image filename.",
    required=True
)
parser.add_argument("-p", "--report_field_positions",
    help="colon-separated pairs with the report fields (created in setup) " + 
    "that will contain each of the annotations from the annotation file, and the (0-based) " + 
    "positions in the entries that they match. " + 
    "Example (using default report fields from setup): chrom:2 pos:3 end:4",
    type=key_val,
    nargs="+",
    required=True
)
parser.add_argument('-s', "--separator",
    help="single character used to separate fields in annotations file. Default: whitespace (\s)"
)

args = parser.parse_args()
if args.separator is not None and (len(args.separator) != 1):
    print ("\nIf separator is set, it must be exactly one character\n")
    parser.print_help()
    sys.exit(1)

report_field_positions = dict(args.report_field_positions)
config_data = json.load(open(args.config,'r'))
img_files =  os.listdir(args.images_directory)
annotated_imgs_dict = {}

with open(args.annotation_file, 'r') as annotation_file:
    for line in annotation_file:
        if args.separator:
            fields =  line.strip().split(args.separator)
        else:
            fields =  line.strip().split()
        if fields[0] in img_files:
            annotated_imgs_dict[fields[0]] = fields

for img in annotated_imgs_dict:
    metadata = {}
    for report_field in config_data['reportFields']:
        report_value = annotated_imgs_dict[img][int(report_field_positions[report_field])]
        if is_number(report_value):
            metadata[report_field] = int(report_value)
        else:
            metadata[report_field] = report_value

    metadata['summaryData'] = config_data['summaryFields']
    meta_filename = os.path.splitext(img)[0]
    with open(os.path.join(args.images_directory,  meta_filename+".json"), 'w') as meta_file:
        json.dump(metadata, meta_file)
