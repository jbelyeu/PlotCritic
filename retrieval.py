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
#    response = sveee_table.query(KeyConditionExpression=Key('identifier').scan())
    response = sveee_table.scan()
except ClientError as e:
    print (e.response['Error']['Message'])
else:
    for entry in response['Items']:
        print("\nEntry")
        pprint (entry)
