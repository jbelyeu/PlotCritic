#! /usr/bin/env python
from __future__ import print_function
# Python 2/3 compatibility
from .__init__ import get_templates
import sys
import os
import json
import shutil


samplot_question = "Does the top sample support the variant type shown? " +\
    "If so, does it appear to be a de novo mutation? Choose one answer " + \
    "from below or type the corresponding letter key."

samplot_answers = {
    "s" : "Supports",
    "n" : "Does not support",
    "d" : "De novo",
}
samplot_report_fields = [
    "Image",
    "chrom", 
    "start", 
    "end",
    "sv_type",
    "reference",
    "bams",
    "titles",
    "output_file",
    "transcript_file",
    "window",
    "max_depth",
]

samplot_summary_fields = [
    "Image",
    "chrom", 
    "start", 
    "end",
    "sv_type",
]


def valid_data_fields(report_fields, summary_fields):
    """
    All summary fields must be included in the report fields
    """
    if not summary_fields:
        summary_fields = ["Image"]
    if not report_fields:
        report_fields = ["Image"]
    else:
        for key in summary_fields:
            if key not in report_fields:
                parser.print_help()
                sys.exit("all summary_fields must also be included in report_fields")
    return report_fields,summary_fields

def validate_json_fields(metadata, report_fields, parser):
    """
    All user-defined report fields must be included in the metadata.
    Summary fields also must be included in metadata, but this is 
    handled by validate_summary_fields()
    """
    for key in report_fields:
        if key not in metadata and key != "Image":
            parser.print_help()
            sys.exit("all report_fields must also be included in a metadata .json object matched to each image")

def valid_curation(curation_answers, curation_question, parser):
    answer_dict = {}
    #check the curation question and answers for validity
    if curation_answers and curation_question:
        ## check answer codes
        try:
            for k,val in curation_answers:
                if len(k) != 1:
                    print ("\nError: curation answers must have a 1-letter code\n")
                    parser.print_help()
                    sys.exit(1)
                else:
                    answer_dict[k] = val
        except Exception as e:
            print (e)
            parser.print_help()
            sys.exit("Invalid curation answer format")
        return curation_question,answer_dict
    elif curation_answers or curation_question:
        print ("\nError: if curation question or curation answer "
                + "arguments are set, both must be\n")
        parser.print_help()
        sys.exit(1)
    else:
        #they set neither, so set to the samplot defaults
        return samplot_question,samplot_answers


def copy_images(images_dir, config_data, parser):
    for img_file in os.listdir(images_dir):
        img_name,img_ext = os.path.splitext(img_file)
        metadata_filename = os.path.join(images_dir, img_name + ".json")
        metadata = {}
        
        #if this isn't a metadata file but one exists for it, open that metadata and read it
        if ".json" == img_ext:
            continue #skip the json files

        if (not (".json" == img_ext) 
                and os.path.exists(metadata_filename) 
                and os.path.isfile(metadata_filename)):
            with open(metadata_filename, 'r') as meta_handle :
                metadata = json.load(meta_handle)
                validate_json_fields(
                        metadata, 
                        config_data['reportFields'],
                        parser
                )
        metadata["Image"] = img_name
        metadata["img_location"] = os.path.join("../imgs", img_file)
        config_data['image_data'].append(metadata)
        
        #copy the image
        shutil.copy(
                os.path.join(images_dir, img_file), 
                os.path.join(config_data['projectName'],"imgs", img_file) )



def plotcritic(parser):
    args = parser.parse_args()
    config_data = {}
    config_data['projectName'] = args.project
    curation_question,curation_answers = valid_curation(
            args.curation_answers,
            args.curation_question,
            parser
    )
    config_data["curationQandA"] = {
        "question": curation_question,
        "answers" : curation_answers
    }
    
    if args.use_samplot_defaults:
        config_data['reportFields'] = samplot_report_fields
        config_data['summaryFields'] = samplot_summary_fields
    else:
        config_data['reportFields'],config_data['summaryFields'] = valid_data_fields(
            args.report_fields, args.summary_fields)


    #make sure we can create the new website for the project name
    if os.path.exists(args.project):
        sys.exit("project directory already exists."
                + " Remove it or change project name before continuing.")

    #copy the templates for the web site
    shutil.copytree(get_templates(), args.project)


    #add the images to the website
    config_data["image_data"] = []
    os.makedirs(os.path.join(args.project,"imgs/"))
    copy_images(args.images_dir, config_data, parser)

        
    #create environment JS file
    try:
        with open(os.path.join(args.project,"js","env.js"), 'w') as env_file:
            print('(function (window) {window.__env = window.__env || {};window.__env.config = '
                + json.dumps(config_data)
                + '}(this));', file=env_file)
    except:
        print(os.listdir(args.project))


if __name__ == "__main__":
    sys.exit("Import this as a module")
