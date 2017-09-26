#! /usr/bin/env python
from __future__ import print_function
# Python 2/3 compatibility
import sys
import os
import json
import argparse
import boto3
import urllib

#parser = argparse.ArgumentParser(description="")
#parser.add_argument("-p", "--project_name", 
#    help="name to uniquely identify the project. Must be unique to this project.",
#    required=True
#)
#parser.add_argument('-c', "--config_file", 
#    help="Configuration file with AWS credentials",
#    required=True
#)
#args = parser.parse_args()
#with open(args.config_file,'r') as config_file:
#    config_data = json.load(config_file)
#
###create AWS S3 bucket set up as web server with folder named after the project for images
###################################################################################
#bucket_name = args.project_name.replace("_", "-").lower() + "-plotcritic-bucket"
#s3_client = boto3.client('s3',
#    aws_access_key_id=config_data['accessKey'],
#    aws_secret_access_key=config_data['secretAccessKey']
#)
#s3_create_bucket_response = s3_client.create_bucket(
#    ACL='public-read',
#    Bucket=bucket_name
#)
#s3_configure_bucket_website_response = s3_client.put_bucket_website(
#    Bucket=bucket_name,
#    WebsiteConfiguration={
#        'IndexDocument': {
#            'Suffix': 'index.html'
#        }
#    }
#)
#
##create dynamoDB img table (named {project}_img_metadata)
###################################################################################
#img_table_name =  project_name + "_img_metadata"
#scores_table_name = project_name + "_scores"
#dynamodb_client = boto3.client('dynamodb',
#    aws_access_key_id=config_data['accessKey'],
#    aws_secret_access_key=config_data['secretAccessKey']
#)
#)
#create_img_table_response = dynamodb_client.create_table(
#    AttributeDefinitions=[
#        {
#            'AttributeName': 'identifier',
#            'AttributeType': 'S'
#        },
#    ],
#    TableName=img_table_name,
#    KeySchema=[
#        {
#            'AttributeName': 'identifier',
#            'KeyType': 'HASH'
#        },
#    ],
#    ProvisionedThroughput={
#        'ReadCapacityUnits': 5,
#        'WriteCapacityUnits': 5
#    },
#)
#
##create dynamoDB scores table (named {project}_scores)
###################################################################################
#create_scores_table_response = dynamodb_client.create_table(
#    AttributeDefinitions=[
#        {
#            'AttributeName': 'id',
#            'AttributeType': 'S'
#        },
#    ],
#    TableName=img_table_name,
#    KeySchema=[
#        {
#            'AttributeName': 'id',
#            'KeyType': 'HASH'
#        },
#    ],
#    ProvisionedThroughput={
#        'ReadCapacityUnits': 5,
#        'WriteCapacityUnits': 5
#    },
#)
#
##Create user pool (authentication on the app)
#################################################################################
#cognito_identity_provider_client = boto3.client('cognito-idp',
#    aws_access_key_id=config_data['accessKey'],
#    aws_secret_access_key=config_data['secretAccessKey']
#)
#user_pool_response = cognito_identity_provider_client.create_user_pool(
#    PoolName='PlotCriticPool_Sept25',
#    Policies={
#        'PasswordPolicy': {
#            'MinimumLength': 6,
#            'RequireUppercase': False,
#            'RequireLowercase': False,
#            'RequireNumbers': False,
#            'RequireSymbols': False
#        }
#    },
#    UsernameAttributes=[
#        'email',
#    ],
#    AutoVerifiedAttributes=[
#        'email',
#    ],
#    VerificationMessageTemplate={
#        'EmailMessage': 'You have been invited to join a PlotCritic project. Enter your email and confirmation code {####} as password at website',
#        'EmailSubject': 'PlotCritic Invitation',
#        'DefaultEmailOption': 'CONFIRM_WITH_CODE'
#    },
#    AdminCreateUserConfig={
#        'AllowAdminCreateUserOnly': False
#    },
#)
#user_pool_id = user_pool_response['UserPool']['Id']
#user_pool_region = user_pool_id.split("_")[0]
#user_pool_provider_name = "cognito-idp." + user_pool_region + ".amazonaws.com/" + user_pool_id
#
#
##Create user pool client (get code to associate application with the user pool)
#################################################################################
#user_pool_client_response = cognito_identity_provider_client.create_user_pool_client(
#    UserPoolId=user_pool_id,
#    ClientName='PlotCriticClient',
#    GenerateSecret=False
#)
#
##create identity pool
#################################################################################
#cognito_identity_pool_client = boto3.client('cognito-identity',
#    aws_access_key_id=config_data['accessKey'],
#    aws_secret_access_key=config_data['secretAccessKey']
#)
#identity_pool_response = cognito_identity_pool_client.create_identity_pool(
#    IdentityPoolName='PlotCriticIdentityPool_Sept25',
#    AllowUnauthenticatedIdentities=False,
#    CognitoIdentityProviders=[
#        {
#            'ProviderName': user_pool_provider_name,
#            'ClientId': user_pool_client_response['UserPoolClient']['ClientId']
#        }
#    ]
#)
#
##write out access policy
#################################################################################
#policy = {
#  "Version": "2012-10-17",
#  "Statement": [
#    {
#      "Effect": "Allow",
#      "Principal": {"Federated": "cognito-identity.amazonaws.com"},
#      "Action": "sts:AssumeRoleWithWebIdentity",
#      "Condition": {
#        "StringEquals": {
#          "cognito-identity.amazonaws.com:aud": identity_pool_response['IdentityPoolId']
#        },
#        "ForAnyValue:StringLike": {
#          "cognito-identity.amazonaws.com:amr": "authenticated"
#        }
#      }
#    }
#  ]
#}
#
##create IAM role with the above policy
#################################################################################
#iam_client = boto3.client('iam',
#    aws_access_key_id=config_data['accessKey'],
#    aws_secret_access_key=config_data['secretAccessKey']
#)
#iam_role_response = iam_client.create_role(
#    RoleName='PlotCriticRole_Sept25',
#    Path="/",
#    AssumeRolePolicyDocument=json.dumps(policy),
#    Description='PlotCritic role'
#)
#
##attach role policy for full dynamo access
#################################################################################
#attach_role_policy_response = iam_client.attach_role_policy(
#    RoleName='PlotCriticRole_Sept25',
#    PolicyArn='arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess'
#)
#
##add role to identity pool
#################################################################################
#add_role_to_identity_pool_response = cognito_identity_pool_client.set_identity_pool_roles(
#    IdentityPoolId=identity_pool_response['IdentityPoolId'],
#    Roles={
#        'authenticated': iam_role_response['Role']['Arn']
#    }
#)
#
##create user in the user pool
##################################################################################
#create_user_response = cognito_identity_provider_client.sign_up(
#    ClientId=user_pool_client_response['UserPoolClient']['ClientId'],
#    Username='jrbelyeu@gmail.com',
#    Password='Password1@',
#    UserAttributes=[
#        {
#            'Name': 'email',
#            'Value': 'jrbelyeu@gmail.com'
#        },
#    ]
#)
#
#
#
##write out the environment variables to env.js
##################################################################################
#env_header = "(function (window) {window.__env = window.__env || {};window.__env.config = "
#env_obj = {"dynamoRegion" : user_pool_region,
#    "region" : user_pool_region,
#    "dynamoScoresTable" : "na12878_scores",
#    "dynamoImagesTable" : "na12878_img_metadata",
#    "projectName" : "js_test",
#    "AWSBucketName" : "sveee",
#    "AWSBucketURl" : "http://sveee.s3-website-us-east-1.amazonaws.com/",
#    "userPoolId" : user_pool_id,
#    "clientID" : user_pool_client_response['UserPoolClient']['ClientId'],
#    "identityPoolId" : identity_pool_response['IdentityPoolId'],
#    "curationQandA" : {
#            "question": "Does the top sample support the variant type shown? If so, does it appear to be a de novo mutation? Choose one answer from below or type the corresponding letter key.",
#            "answers" : {
#                    "s" : "Supports",
#                    "n" : "Does not support",
#                    "d" : "De novo"
#            }
#    },
#    "reportFields" : [
#            "chrom", 'start', 'end'
#    ]}
#env_footer = "}(this));"
#
#with open("env.js", 'w') as env_file:
#    env_file.write(env_header)
#    json.dump(env_obj, env_file)
#    env_file.write(env_footer)

#upload the website code to S3 - apparently has to be done one file at a time
################################################################################
s3 = boto3.resource('s3',
    aws_access_key_id=config_data['accessKey'],
    aws_secret_access_key=config_data['secretAccessKey']
)

s3.meta.client.upload_file('/tmp/hello.txt', bucket_name, 'hello.txt')
