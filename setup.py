#! /usr/bin/env python
from __future__ import print_function
# Python 2/3 compatibility
import sys
import os
import json
import argparse
import boto3

parser = argparse.ArgumentParser(description="Set up a PlotCritic Project")
parser.add_argument('-p', "--project", 
    help="Unique name for the project",
    required=True
)
parser.add_argument('-a', "--access-key-id", 
    help="AWS Access Key ID",
    required=True
)
parser.add_argument('-s', "--secret-access-key", 
    help="AWS Secret Access Key",
    required=True
)
parser.add_argument('-e', "--email", 
    help="Admin user email address",
    required=True
)
args = parser.parse_args()

#create AWS S3 bucket set up as web server with folder named after the project for images
###################################################################################
try:
    bucket_name = args.project.replace("_", "-").lower() + "-plotcritic-bucket"
    s3_client = boto3.client('s3',
        aws_access_key_id=args.access_key_id,
        aws_secret_access_key=args.secret_access_key
    )
    s3_create_bucket_response = s3_client.create_bucket(
        ACL='public-read',
        Bucket=bucket_name
    )
    s3_configure_bucket_website_response = s3_client.put_bucket_website(
        Bucket=bucket_name,
        WebsiteConfiguration={
            'IndexDocument': {
                'Suffix': 'index.html'
            },
            'ErrorDocument' : {
                'Key' : 'error.html'
            }
        }
    )
    bucket_endpoint = "http://"+ bucket_name + ".s3-website-us-east-1.amazonaws.com"
except Exception as e:
    print ("Error: Failed to create S3 bucket. Exiting setup")
    print (e)
    sys.exit(1)

#create dynamoDB img table (named {project}_img_metadata)
###################################################################################
try:
    img_table_name =  args.project + "_img_metadata"
    dynamodb_client = boto3.client('dynamodb',
        aws_access_key_id=args.access_key_id,
        aws_secret_access_key=args.secret_access_key
    )

    create_img_table_response = dynamodb_client.create_table(
        AttributeDefinitions=[
            {
                'AttributeName': 'identifier',
                'AttributeType': 'S'
            },
        ],
        TableName=img_table_name,
        KeySchema=[
            {
                'AttributeName': 'identifier',
                'KeyType': 'HASH'
            },
        ],
        ProvisionedThroughput={
            'ReadCapacityUnits': 5,
            'WriteCapacityUnits': 5
        },
    )
except Exception as e:
    print ("Error: Failed to create DynamoDB table. Exiting setup")
    print (e)
    sys.exit(1)

#create dynamoDB scores table (named {project}_scores)
##################################################################################
try:
    scores_table_name = args.project + "_scores"
    create_scores_table_response = dynamodb_client.create_table(
        AttributeDefinitions=[
            {
                'AttributeName': 'id',
                'AttributeType': 'S'
            },
        ],
        TableName=scores_table_name,
        KeySchema=[
            {
                'AttributeName': 'id',
                'KeyType': 'HASH'
            },
        ],
        ProvisionedThroughput={
            'ReadCapacityUnits': 5,
            'WriteCapacityUnits': 5
        },
    )
except Exception as e:
    print ("Error: Failed to create DynamoDB table. Exiting setup")
    print (e)
    sys.exit(1)

#Create user pool (authentication on the app)
################################################################################
try:
    cognito_identity_provider_client = boto3.client('cognito-idp',
        aws_access_key_id=args.access_key_id,
        aws_secret_access_key=args.secret_access_key
    )

    user_pool_response = cognito_identity_provider_client.create_user_pool(
        PoolName=args.project + 'PlotCriticPool',
        Policies={
            'PasswordPolicy': {
                'MinimumLength': 6,
                'RequireUppercase': False,
                'RequireLowercase': False,
                'RequireNumbers': False,
                'RequireSymbols': False
            }
        },
        UsernameAttributes=[
            'email',
        ],
        AutoVerifiedAttributes=[
            'email',
        ],
        VerificationMessageTemplate={
            'EmailMessage': 'You have been invited to join a PlotCritic project at ' +
            bucket_endpoint + 'This email address is your username. Enter the following ' +
            'confirmation code to gain access and set your own password: {####}.',
            'EmailSubject': 'PlotCritic Invitation',
            'DefaultEmailOption': 'CONFIRM_WITH_CODE'
        },
        AdminCreateUserConfig={
            'AllowAdminCreateUserOnly': False
        },
    )
    user_pool_id = user_pool_response['UserPool']['Id']
    user_pool_region = user_pool_id.split("_")[0]
    user_pool_provider_name = "cognito-idp." + user_pool_region + ".amazonaws.com/" + user_pool_id
except Exception as e:
    print ("Error: Failed to create User Pool. Exiting setup")
    print (e)
    sys.exit(1)

#Create user pool client (get code to associate application with the user pool)
################################################################################
try:
    user_pool_client_response = cognito_identity_provider_client.create_user_pool_client(
        UserPoolId=user_pool_id,
        ClientName='PlotCriticClient',
        GenerateSecret=False
    )
except Exception as e:
    print ("Error: Failed to create User Pool Client. Exiting setup")
    print (e)
    sys.exit(1)

#create identity pool
################################################################################
try:
    cognito_identity_pool_client = boto3.client('cognito-identity',
        aws_access_key_id=args.access_key_id,
        aws_secret_access_key=args.secret_access_key
    )
    identity_pool_response = cognito_identity_pool_client.create_identity_pool(
        IdentityPoolName=args.project + 'PlotCriticIdentityPool',
        AllowUnauthenticatedIdentities=False,
        CognitoIdentityProviders=[
            {
                'ProviderName': user_pool_provider_name,
                'ClientId': user_pool_client_response['UserPoolClient']['ClientId']
            }
        ]
    )
except Exception as e:
    print ("Error: Failed to create Identity Pool. Exiting setup")
    print (e)
    sys.exit(1)

#identity pool access policy
################################################################################
policy = {
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"Federated": "cognito-identity.amazonaws.com"},
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": identity_pool_response['IdentityPoolId']
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "authenticated"
        }
      }
    }
  ]
}

#create IAM role with the above policy
################################################################################
try:
    role_name = args.project + "PlotCriticRole" 
    iam_client = boto3.client('iam',
        aws_access_key_id=args.access_key_id,
        aws_secret_access_key=args.secret_access_key
    )
    iam_role_response = iam_client.create_role(
        RoleName=role_name,
        Path="/",
        AssumeRolePolicyDocument=json.dumps(policy),
        Description='PlotCritic role for ' + args.project
    )
except Exception as e:
    print ("Error: Failed to create IAM Role. Exiting setup")
    print (e)
    sys.exit(1)

#attach role policy for full dynamo access
################################################################################
#TODO switch to lower-access policy
try:
    attach_role_policy_response = iam_client.attach_role_policy(
        RoleName=role_name,
        PolicyArn='arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess'
    )
except Exception as e:
    print ("Error: Failed to attach Identity Role Policy. Exiting setup")
    print (e)
    sys.exit(1)


#add role to identity pool
################################################################################
try:
    add_role_to_identity_pool_response = cognito_identity_pool_client.set_identity_pool_roles(
        IdentityPoolId=identity_pool_response['IdentityPoolId'],
        Roles={
            'authenticated': iam_role_response['Role']['Arn']
        }
    )
except Exception as e:
    print ("Error: Failed to attach Role to Identity Pool. Exiting setup")
    print (e)
    sys.exit(1)

#create user in the user pool
#################################################################################
try:
    create_user_response = cognito_identity_provider_client.sign_up(
        ClientId=user_pool_client_response['UserPoolClient']['ClientId'],
        Username=args.email,
        Password='Password1@',
        UserAttributes=[
            {
                'Name': 'email',
                'Value': args.email
            }
        ]
    )
except Exception as e:
    print ("Error: Failed to create User Pool user. Exiting setup")
    print (e)
    sys.exit(1)

#write out the environment variables to env.js
#################################################################################
try:
    env_header = "(function (window) {window.__env = window.__env || {};window.__env.config = "
    env_obj = {"dynamoRegion" : user_pool_region,
        "region" : user_pool_region,
        "dynamoScoresTable" : scores_table_name,
        "dynamoImagesTable" : img_table_name,
        "projectName" : args.project,
        "AWSBucketName" : bucket_name,
        "AWSBucketURl" : bucket_endpoint,
        "userPoolId" : user_pool_id,
        "clientID" : user_pool_client_response['UserPoolClient']['ClientId'],
        "identityPoolId" : identity_pool_response['IdentityPoolId'],
        "curationQandA" : {
                "question": "Does the top sample support the variant type shown? If so, does it appear to be a de novo mutation? Choose one answer from below or type the corresponding letter key.",
                "answers" : {
                        "s" : "Supports",
                        "n" : "Does not support",
                        "d" : "De novo"
                }
        },
        "reportFields" : [
                "chrom", 'start', 'end'
        ]}
    env_footer = "}(this));"
    rel_path = os.path.dirname(sys.argv[0])
    with open(os.path.join(rel_path,"website/js/env.js"), 'w') as env_file:
        env_file.write(env_header)
        json.dump(env_obj, env_file)
        env_file.write(env_footer)

    env_obj['accessKey'] = args.access_key_id
    env_obj['secretAccessKey'] = args.secret_access_key
    with open(os.path.join(rel_path,"config.json"), 'w') as conf_file:
        json.dump(env_obj, conf_file)
except Exception as e:
    print ("Error: Failed to write out config data: ")
    print (env_obj)
    print ("Exiting setup")
    print (e)
    sys.exit(1)

#upload the website code to S3 - apparently has to be done one file at a time
###############################################################################
try:
    s3_resource = boto3.resource('s3',
        aws_access_key_id=args.access_key_id,
        aws_secret_access_key=args.secret_access_key
    )
    for subdir, dirs, files in os.walk(os.path.join(rel_path,"website/")):
        for file_name in files:
            if file_name[0] == ".":
                continue
            content_type = "text/html"
            if file_name[-3:] == "css":
                content_type = "text/css"
            full_path = os.path.join(subdir, file_name)
            key = full_path.replace(os.path.join(rel_path,"website/"), "")
            s3_resource.meta.client.upload_file(
                full_path,
                bucket_name,
                key,
                ExtraArgs={
                    'ACL': 'public-read',
                    'ContentType' : content_type
                }
            )
except Exception as e:
    print ("Error: Failed to upload website to S3 bucket. Exiting setup")
    print (e)
    sys.exit(1)
