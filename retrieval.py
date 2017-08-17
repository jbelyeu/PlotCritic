from __future__ import print_function # Python 2/3 compatibility
import boto3
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError
import json
from pprint import pprint
with open("config.json",'r') as config_file:
    config_data = json.load(config_file)
dynamodb = boto3.resource('dynamodb', region_name=config_data['region'], endpoint_url=config_data['dynamoEndpoint'])
sveee_table = dynamodb.Table(config_data['dynamoTable'])
try:
    response = sveee_table.scan()
except ClientError as e:
    print (e.response['Error']['Message'])
else:
    header_fields = ["BUCKET","EMAIL","IMAGE", "SCORE", "TIMESTAMP", "PROJECT", "IDENTIFIER"]
    print ("#" + "\t".join(header_fields))
    for entry in response['Items']:
        if not entry['project']:
            entry['project'] = "*"
        print ("\t".join([entry['bucket'],entry['email'],entry['image'],str(entry['score']),str(entry['timestamp']), entry['project'], entry['identifier']]))
