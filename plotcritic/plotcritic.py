#! /usr/bin/env python
from __future__ import print_function
# Python 2/3 compatibility
import sys
import os
import json
import shutil


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

def plotcritic(parser):
    args = parser.parse_args()
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
