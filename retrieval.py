from __future__ import print_function # Python 2/3 compatibility
import sys 
import boto3
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError
import json
import argparse
import os

def key_val(arg):
    return [str(x) for x in arg.split(',')]

def filter_old_responses(response_items):
    # dictionary of image names to dictionaries of emails to timestamps
    most_recent_score_by_email = {}
    for entry in response_items:
        img_name = entry['image']
        email = entry['email']
        response_time = int(entry['response_time'])
        if img_name not in most_recent_score_by_email:
            most_recent_score_by_email[img_name] = {}

        if (email not in most_recent_score_by_email[img_name]) or (response_time > most_recent_score_by_email[img_name][email]):
            most_recent_score_by_email[img_name][email] = response_time
    filtered_response_items = []
    for entry in response_items:
        if most_recent_score_by_email[entry['image']][entry['email']] == int(entry['response_time']):
            filtered_response_items.append(entry)
    return filtered_response_items

parser = argparse.ArgumentParser(
    description="Tool for retrieving entries from the SVeee DynamoDB tables")
parser.add_argument('-f', "--filters", 
    help="comma-separated key,values pairs of filters for entries to report (i.e: 'key1','value1' 'key2','value2'",
    required=False, 
    type=key_val, 
    nargs="+")
parser.add_argument('-v', "--verbose", 
    help="Run verbosely. If not specified, entries missing fields will be omitted",
    required=False,
    action="store_true")
parser.add_argument("-c","--config",
    help="Config file for accessing AWS resources",
    required=True)
parser.add_argument("-m", "--most_recent",
    action="store_true",
    help="Reports onlythe most recent score from each curator for each image"
)
args = parser.parse_args()

with open(args.config, 'r') as config_file:
    config_data = json.load(config_file)

endpoint = "https://dynamodb." + config_data['region']+ ".amazonaws.com" 
dynamodb = boto3.resource('dynamodb', 
    region_name=config_data['region'], 
    endpoint_url=endpoint,
    aws_access_key_id=config_data['accessKey'], 
    aws_secret_access_key=config_data['secretAccessKey']
)
sveee_table = dynamodb.Table(config_data['dynamoScoresTable'])
response_items = []
try:
    response = sveee_table.scan()
    response_items += response['Items']
    while 'LastEvaluatedKey' in response:
        response = sveee_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        response_items.extend(response['Items'])
except ClientError as e:
    print (e.response['Error']['Message'])
else:
    if args.most_recent:
        response_items = filter_old_responses(response_items)

    question = config_data['curationQandA']['question']
    answers = []
    for answer in config_data['curationQandA']['answers']:
        answers.append(config_data['curationQandA']['answers'][answer])
    print ("#Q:" + question)
    print ("#A:" + "\t".join(answers))

    header_fields = ["BUCKET","EMAIL","IMAGE", "SCORE", "LOADTIME", "RESPONSETIME", "PROJECT", "IDENTIFIER"]
    header_fields = header_fields + config_data['reportFields']
    print ("#" + "\t".join(header_fields))

    for entry in response_items:
        skip = False
        if args.filters:
            for filt in args.filters:
                if filt[0] not in entry or str(entry[filt[0]]) != str(filt[1]):
                    skip = True
                    continue
        if not skip:
            try:
                fields_to_show = [entry['bucket'],entry['email'],entry['image'],str(entry['score']),
                    str(entry['load_time']), str(entry['response_time']), entry['project']]
                
                for field in config_data['reportFields']:
                    fields_to_show.append(entry[field])
                print ("\t".join(fields_to_show))
            except Exception as e:
                if args.verbose:
                    print("Error printing entry: " + str(entry), file=sys.stderr)
                    print (e, file=sys.stderr)
