#! /usr/bin/env python
from __future__ import print_function
# Python 2/3 compatibility
import sys
import os
import json
import shutil


def key_val(arg):
    return [str(x) for x in arg.split(':')]

default_question = "Does the top sample support the variant type shown? " +\
    "If so, does it appear to be a de novo mutation? Choose one answer " + \
    "from below or type the corresponding letter key."

default_answers = {
    "s" : "Supports",
    "n" : "Does not support",
    "d" : "De novo"
}
default_report_fields = [
    "chrom", 
    'start', 
    'end',
    'sv_type',
    'reference',
    'bams',
    'titles',
    'output_file',
    'transcript_file',
    'window',
    'max_depth'
]

def add_create(p):
    parser = p.add_parser(
        "create",
        help="creates a website for image curation",
        description="given a set of images and metadata files, creates a local website for"
        " curating images based on a given question and answer set"
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
    parser.set_defaults(func=create)


def create(parser, args):
    config_data = {}
    curation_question = ''
    curation_answers = {}


    #check the curation question and answers for validity
    if args.curation_answers and args.curation_question:
        ## check answer codes
        try:
            for k,val in args.curation_answers:
                if len(k) != 1:
                    print ("\nError: curation answers must have a 1-letter code\n")
                    parser.print_help()
                    sys.exit(1)
                else:
                    curation_answers[k] = val
        except Exception as e:
            print (e)
            parser.print_help()
            sys.exit(1)
        curation_question = args.curation_question
    elif args.curation_answers or args.curation_question:
        print ("\nError: if curation question or curation answer arguments are set, both must be\n")
        parser.print_help()
        sys.exit(1)
    else:
        #they set neither, so set defaults
        curation_question = default_question
        curation_answers = default_answers

    config_data['projectName'] = args.project
    config_data["curationQandA"] = {
        "question": curation_question,
        "answers" : curation_answers
    }
    config_data['reportFields'] = args.report_fields
    config_data['summaryFields'] = args.summary_fields


    #create the new website for the project name
    if os.path.exists(args.project):
        sys.exit("project directory already exists. Remove it or change project name before continuing.")

    #copy the templates for the web site
    shutil.copytree(os.path.join(os.path.dirname(__file__), "templates"), args.project)

    #add the images to the website
    config_data["image_data"] = []
    os.makedirs(os.path.join(args.project,"imgs/"))

    for img_file in os.listdir(args.images_dir):
        img_name,img_ext = os.path.splitext(img_file)
        metadata_filename = os.path.join(args.images_dir, img_name + ".json")
        metadata = {}
        
        #if this isn't a metadata file but one exists for it, open that metadata and read it
        if ".json" == img_ext:
            continue #skip the json files

        if not ".json" == img_ext and os.path.exists(metadata_filename) and os.path.isfile(metadata_filename):
            with open(metadata_filename, 'r') as meta_handle :
                metadata = json.load(meta_handle)
        metadata["img_name"] = img_name
        metadata["img_location"] = os.path.join("../imgs", img_file)
        config_data['image_data'].append(metadata)

        
        #copy the image
        shutil.copy(os.path.join(args.images_dir, img_file), os.path.join(args.project,"imgs", img_file) )

    with open(os.path.join(args.project,"js","env.js"), 'w') as env_file:
        print('(function (window) {window.__env = window.__env || {};window.__env.config = '
                + json.dumps(config_data)
                + '}(this));', file=env_file)


if __name__ == "__main__":
    sys.exit("Import this as a module")
