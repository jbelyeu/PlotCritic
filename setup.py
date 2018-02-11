#! /usr/bin/env python
from __future__ import print_function
# Python 2/3 compatibility
import sys
import os
import json
import argparse
import boto3

def key_val(arg):
    return [str(x) for x in arg.split(':')]

default_question = "Does the top sample support the variant type shown? If so, does it appear to be a de novo mutation? Choose one answer from below or type the corresponding letter key."
default_answers = {
    "s" : "Supports",
    "n" : "Does not support",
    "d" : "De novo"
}
default_report_fields = [
                "chrom", 'start', 'end'
        ]

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
parser.add_argument('-r', "--randomize",
    help="randomize the order in which images are shown to curating scorers",
    action="store_true"
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
    required=False
)

args = parser.parse_args()
curation_question = ''
curation_answers = {}
if args.curation_answers and args.curation_question:
    ## check answer codes
    for k,val in args.curation_answers:
        if len(k) != 1:
            print ("\nError: curation answers must have a 1-letter code\n")
            parser.print_help()
            sys.exit(1)
        else:
            curation_answers[k] = val
    curation_question = args.curation_question
elif args.curation_answers or args.curation_question:
    print ("\nError: if curation question or curation answer arguments are set, both must be\n")
    parser.print_help()
    sys.exit(1)
else:
    ##they set neither, so set defaults
    curation_question = default_question
    curation_answers = default_answers

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
    print (type(e))
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
except dynamodb_client.exceptions.ResourceInUseException as e:
    print ("Error: A DynamoDB table already exists with the name " + args.project + "_img_metadata" + 
            ", generated for project name " + args.project + ".")
    print ("You may wish to change the name of this project (by changing the -p flag) to avoid overwriting a previous project.\n")
    print ("If you would rather remove the current project named " + args.project + 
            " you may do so using the AWS Console or with the `delete_project` script, using the config.json file created during setup.")
    print ("Ex. `python delete_project.py -c config.json -f`")
    sys.exit(1)
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
except dynamodb_client.exceptions.ResourceInUseException as e:
    print ("Error: A DynamoDB table already exists with the name " + args.project + "_scores" + 
            ", generated for project name " + args.project + ".")
    print ("You may wish to change the name of this project (by changing the -p flag) to avoid overwriting a previous project.\n")
    print ("If you would rather remove the current project named " + args.project + 
            " you may do so using the AWS Console or with the `delete_project` script, using the config.json file created during setup.")
    print ("Ex. `python sv_plaudit/PlotCritic/delete_project.py -c sv_plaudit/PlotCritic/config.json -f`")
    sys.exit(1)
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
            bucket_endpoint + '. This email address is your username. Enter the following ' +
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
except dynamodb_client.exceptions.ResourceInUseException as e:
    print ("Error: A User Pool already exists with the name " + args.project + 'PlotCriticPool' + 
            ", generated for project name " + args.project + ".")
    print ("You may wish to change the name of this project (by changing the -p flag) to avoid overwriting a previous project.\n")
    print ("If you would rather remove the current project named " + args.project + 
            " you may do so using the AWS Console or with the `delete_project` script, using the config.json file created during setup.")
    print ("Ex. `python sv_plaudit/PlotCritic/delete_project.py -c sv_plaudit/PlotCritic/config.json -f`")
    sys.exit(1)
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
except dynamodb_client.exceptions.ResourceInUseException as e:
    print ("Error: A User Pool already exists with the name " + args.project + 'PlotCriticPool' + 
            ", generated for project name " + args.project + ".")
    print ("You may wish to change the name of this project (by changing the -p flag) to avoid overwriting a previous project.\n")
    print ("If you would rather remove the current project named " + args.project + 
            " you may do so using the AWS Console or with the `delete_project` script, using the config.json file created during setup.")
    print ("Ex. `python sv_plaudit/PlotCritic/delete_project.py -c sv_plaudit/PlotCritic/config.json -f`")
    sys.exit(1)
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
            "randomizeOrder" : args.randomize,
            "curationQandA" : {
                    "question": curation_question,
                    "answers" : curation_answers
            },
            "reportFields" : args.report_fields,
            "summaryFields" : args.summary_fields
        }
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
