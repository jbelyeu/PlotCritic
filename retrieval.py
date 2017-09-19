from __future__ import print_function # Python 2/3 compatibility
import sys 
import boto3
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError
import json
from pprint import pprint
import argparse

def key_val(arg):
    return [str(x) for x in arg.split(',')]
parser = argparse.ArgumentParser(
        description="Tool for retrieving entries from the SVeee DynamoDB tables")
parser.add_argument('-f', "--filters", 
        help="comma-separated key,values pairs of filters for entries to report (i.e: 'key1','value1' 'key2','value2'",
        required=False, 
        type=key_val, 
        nargs="+")
args = parser.parse_args()

with open("config.json",'r') as config_file:
    config_data = json.load(config_file)
dynamodb = boto3.resource('dynamodb', 
    region_name=config_data['region'], 
    endpoint_url=config_data['dynamoEndpoint'],
    aws_access_key_id=config_data['accessKey'], 
    aws_secret_access_key=config_data['secretAccessKey']
)
sveee_table = dynamodb.Table(config_data['dynamoTable'])
try:
    response = sveee_table.scan()
except ClientError as e:
    print (e.response['Error']['Message'])
else:
    header_fields = ["BUCKET","EMAIL","IMAGE", "SCORE", "TIMESTAMP", "PROJECT", "IDENTIFIER"]
    print ("#" + "\t".join(header_fields))

    for entry in response['Items']:
        skip = False
        if args.filters:
            for filt in args.filters:
                if filt[0] not in entry or str(entry[filt[0]]) != str(filt[1]):
                    skip = True
                    continue
        if not skip:
            try:
                print ("\t".join([entry['bucket'],entry['email'],entry['image'],str(entry['score']),str(entry['timestamp']), entry['project'], entry['identifier']]))
            except:
                print("Error printing entry: " + str(entry), file=sys.stderr)
