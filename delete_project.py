#! /usr/bin/env python
from __future__ import print_function
# Python 2/3 compatibility
import sys
import json
import argparse
import boto3
#TODO wrap all deletions in try/excepts so it will keep trying if it fails on one
parser = argparse.ArgumentParser(description="Delete a PlotCritic project. "+
        "Gets info from the `config.json` file created during setup")
parser.add_argument('-f', "--full-delete", 
    help="Delete all project components, including S3 bucket containing images " + 
        "and website, DynamoDB tables, and user access",
    required=False,
    action='store_true'
)
args = parser.parse_args()
try:
    with open(rel_path+'config.json', 'r') as config_file:
        config_data = json.load(config_file)
except:
    print ("Error: missing configuration file " + rel_path + 'config.json.')

#TODO make input work for python 3
try:
    if args.full_delete:
        confirmation = raw_input("Are you sure you want to delete project `" + 
            config_data['projectName']+"` resources (y/n)?: ")
        if confirmation != "y":
            sys.exit(0)
except:
    print ("Delete failed. Make sure you are using python version 2.7. This script does not support Python 3.x")
    sys.exit(0)

# delete s3 bucket
######################################################################
try:
    if not args.full_delete:
        confirmation = raw_input("Are you sure you want to delete S3 bucket `" + 
            config_data['AWSBucketName']+"` (y/n)?: ")
    if confirmation == "y" or args.full_delete:
        s3_resource = boto3.resource('s3',
            aws_access_key_id=config_data['accessKey'],
            aws_secret_access_key=config_data['secretAccessKey']
        )
        bucket = s3_resource.Bucket(config_data['AWSBucketName'])
        bucket.objects.all().delete()
        bucket.delete()
except:
    print ("Warning: Failed to delete S3 bucket")

# delete dynamoDB images table
######################################################################
try:
    if not args.full_delete:
        confirmation = raw_input("Are you sure you want to delete DynamoDB table `" + 
            config_data['dynamoImagesTable']+"` (y/n)?: ")
    if confirmation == "y" or args.full_delete:
        dynamodb_client = boto3.client('dynamodb',
            aws_access_key_id=config_data['accessKey'],
            aws_secret_access_key=config_data['secretAccessKey']
        )

        delete_img_table_response = dynamodb_client.delete_table(
            TableName=config_data['dynamoImagesTable']
        )
except:
    print ("Warning: Failed to delete DynamoDB Table")

# delete dynamodb scores table
######################################################################
try:
    if not args.full_delete:
        confirmation = raw_input("Are you sure you want to delete DynamoDB table `" + 
            config_data['dynamoScoresTable']+"` (y/n)?: ")
    if confirmation == "y" or args.full_delete:
        delete_scores_table_response = dynamodb_client.delete_table(
            TableName=config_data['dynamoScoresTable']
        )
except:
    print ("Warning: Failed to delete DynamoDB Table")

# delete user pool
######################################################################
try:
if not args.full_delete:
    confirmation = raw_input("Are you sure you want to delete User Pool `" + 
        "for `"+config_data['projectName']+"` (y/n)?: ")
if confirmation == 'y' or args.full_delete:
    cognito_identity_provider_client = boto3.client('cognito-idp',
        aws_access_key_id=config_data['accessKey'],
        aws_secret_access_key=config_data['secretAccessKey']
    )
    delete_user_pool_response = cognito_identity_provider_client.delete_user_pool(
        UserPoolId=config_data['userPoolId']
    )
except:
    print ("Warning: Failed to delete User Pool")

# delete identity pool
######################################################################
try:
    if not args.full_delete:
        confirmation = raw_input("Are you sure you want to delete Identity Pool `" + 
            "for `"+config_data['projectName']+"` (y/n)?: ")

    if confirmation == 'y' or args.full_delete:
        cognito_identity_pool_client = boto3.client('cognito-identity',
            aws_access_key_id=config_data['accessKey'],
            aws_secret_access_key=config_data['secretAccessKey']
        )
        delete_identity_pool_response = cognito_identity_pool_client.delete_identity_pool(
            IdentityPoolId=config_data['identityPoolId']
        )
except:
    print ("Warning: Failed to delete Identity Pool")


# delete IAM role
######################################################################
try:
    if not args.full_delete:
        confirmation = raw_input("Are you sure you want to delete IAM Role `" + 
            "for `"+config_data['projectName']+"` (y/n)?: ")

    if confirmation == 'y' or args.full_delete:
        role_name = config_data['projectName'] + "PlotCriticRole" 
        iam_client = boto3.client('iam',
            aws_access_key_id=config_data['accessKey'],
            aws_secret_access_key=config_data['secretAccessKey']
        )

        list_attached_policies_response = iam_client.list_attached_role_policies(
            RoleName=role_name
        )
        for policy in list_attached_policies_response['AttachedPolicies']:
            detach_policy_response = iam_client.detach_role_policy(
                RoleName=role_name,
                PolicyArn=policy['PolicyArn']
            )
        delete_iam_role_response = iam_client.delete_role(
            RoleName=role_name
        )
except:
    print ("Warning: Failed to delete Identity Pool")
