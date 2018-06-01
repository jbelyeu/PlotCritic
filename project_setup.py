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
    required=True
)
parser.add_argument("--region",
    help="AWS region",
    default="us-east-1"
)

config_data = {}
def print_config(failed):
    try:
        # if this is to clean up a failed run
        if failed:
            env_obj = config_data
            rel_path = os.path.dirname(sys.argv[0])
            
            env_obj['accessKey'] = args.access_key_id
            env_obj['secretAccessKey'] = args.secret_access_key
            with open(os.path.join(rel_path,"config_failed.json"), 'w') as conf_file:
                json.dump(env_obj, conf_file)
            print ("Failed to create project "+ config_data['projectName'] + \
                    ". \nConfiguration file `"+os.path.join(rel_path,"config_failed.json")+"` created.\n"+\
                    "Use this file to delete resources partially created. "+\
                    "\nIf setup failed because a previous project had the same name, use previous config file to delete those resources "+\
                    "or use AWS console.")
        else:
            env_header = "(function (window) {window.__env = window.__env || {};window.__env.config = "
            env_obj = config_data
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

args = parser.parse_args()
curation_question = ''
curation_answers = {}
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
    ##they set neither, so set defaults
    curation_question = default_question
    curation_answers = default_answers

config_data['dynamoRegion'] = args.region
config_data['region'] = args.region
config_data['projectName'] = args.project
config_data['AWSBucketName'] = args.project.replace("_", "-").lower() + "-plotcritic-bucket"
config_data['randomizeOrder'] = args.randomize
config_data["curationQandA"] = {
    "question": curation_question,
    "answers" : curation_answers
}
config_data['reportFields'] = args.report_fields
config_data['summaryFields'] = args.summary_fields

#create AWS S3 bucket set up as web server with folder named after the project for images
###################################################################################
try:
    config_data['AWSBucketName'] = config_data['projectName'].replace("_", "-").lower() + "-plotcritic-bucket"
    s3_client = boto3.client('s3',
        aws_access_key_id=args.access_key_id,
        aws_secret_access_key=args.secret_access_key,
        api_version='2006-03-01',
        region_name=config_data['region']
    )
    s3_create_bucket_response = s3_client.create_bucket(
        ACL='public-read',
        Bucket=config_data['AWSBucketName']
    )
    s3_configure_bucket_website_response = s3_client.put_bucket_website(
        Bucket=config_data['AWSBucketName'],
        WebsiteConfiguration={
            'IndexDocument': {
                'Suffix': 'index.html'
            },
            'ErrorDocument' : {
                'Key' : 'error.html'
            }
        }
    )
    config_data['AWSBucketURL'] = "http://"+ config_data['AWSBucketName'] + ".s3-website-us-east-1.amazonaws.com"
except Exception as e:
    print ("Error: Failed to create S3 bucket. Writing out config and exiting setup")
    print_config(True)
    print (type(e))
    sys.exit(1)

#create dynamoDB img table (named {project}_img_metadata)
###################################################################################
config_data['dynamoImagesTable'] =  config_data['projectName'] + "_img_metadata"
dynamodb_client = boto3.client('dynamodb',
    aws_access_key_id=args.access_key_id,
    aws_secret_access_key=args.secret_access_key,
    api_version='2012-08-10',
    region_name=config_data['dynamoRegion']
)

try:
    create_img_table_response = dynamodb_client.create_table(
        AttributeDefinitions=[
            {
                'AttributeName': 'identifier',
                'AttributeType': 'S'
            },
        ],
        TableName=config_data['dynamoImagesTable'],
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
    print ("Error: A DynamoDB table already exists with the name " + config_data['projectName'] + "_img_metadata" + 
            ", generated for project name " + config_data['projectName'] + ".")
    print ("You may wish to change the name of this project (by changing the -p flag) to avoid overwriting a previous project.\n")
    print ("If you would rather remove the current project named " + config_data['projectName'] + 
            " you may do so using the AWS Console or with the `delete_project` script, using the config.json file created during setup.")
    print ("Ex. `python delete_project.py -c config.json -f`")
    print_config(True)
    sys.exit(1)
except Exception as e:
    print ("Error: Failed to create DynamoDB table. Writing out config and exiting setup")
    print (e)
    print_config(True)
    sys.exit(1)

#create dynamoDB scores table (named {project}_scores)
##################################################################################
try:
    config_data['dynamoScoresTable'] = config_data['projectName'] + "_scores"
    create_scores_table_response = dynamodb_client.create_table(
        AttributeDefinitions=[
            {
                'AttributeName': 'id',
                'AttributeType': 'S'
            },
        ],
        TableName=config_data['dynamoScoresTable'],
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
    print ("Error: A DynamoDB table already exists with the name " + config_data['projectName'] + "_scores" + 
            ", generated for project name " + config_data['projectName'] + ".")
    print ("You may wish to change the name of this project (by changing the -p flag) to avoid overwriting a previous project.\n")
    print ("If you would rather remove the current project named " + config_data['projectName'] + 
            " you may do so using the AWS Console or with the `delete_project` script, using the config.json file created during setup.")
    print ("Ex. `python sv_plaudit/PlotCritic/delete_project.py -c sv_plaudit/PlotCritic/config.json -f`")
    print_config(True)
    sys.exit(1)
except Exception as e:
    print ("Error: Failed to create DynamoDB table. Exiting setup")
    print (e)
    print_config(True)
    sys.exit(1)

#Create user pool (authentication on the app)
################################################################################
try:
    cognito_identity_provider_client = boto3.client('cognito-idp',
        aws_access_key_id=args.access_key_id,
        aws_secret_access_key=args.secret_access_key,
        api_version='2016-04-18',
        region_name=config_data['region']
    )

    user_pool_response = cognito_identity_provider_client.create_user_pool(
        PoolName=config_data['projectName'] + 'PlotCriticPool',
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
        EmailVerificationMessage='<p style="font-size:16px;">You have been invited to join the PlotCritic project <a href="' +
        config_data['AWSBucketURL'] + '"><em>'+config_data['projectName']+'</em></a>.</p> <p style="font-size:14px;">'+
            'Your username is the email address this is directed to.</p> '+
            '<p>Be aware that if your email account redirects you may view the invite in another account.</p>'+
            '<br><p style="font-size:16px;">Enter the following confirmation code to gain access and set your own password: <em>{####}</em>.</p>',
        EmailVerificationSubject="PlotCritic Invitation",
        AdminCreateUserConfig={'AllowAdminCreateUserOnly': False},
    )
    config_data['userPoolId'] = user_pool_response['UserPool']['Id']
    config_data['dynamoRegion'] = config_data['userPoolId'].split("_")[0]
    user_pool_provider_name = "cognito-idp." + config_data['dynamoRegion'] + ".amazonaws.com/" + config_data['userPoolId']
except dynamodb_client.exceptions.ResourceInUseException as e:
    print ("Error: A User Pool already exists with the name " + config_data['projectName'] + 'PlotCriticPool' + 
            ", generated for project name " + config_data['projectName'] + ".")
    print ("You may wish to change the name of this project (by changing the -p flag) to avoid overwriting a previous project.\n")
    print ("If you would rather remove the current project named " + config_data['projectName'] + 
            " you may do so using the AWS Console or with the `delete_project` script, using the config.json file created during setup.")
    print ("Ex. `python sv_plaudit/PlotCritic/delete_project.py -c sv_plaudit/PlotCritic/config.json -f`")
    print_config(True)
    sys.exit(1)
except Exception as e:
    print ("Error: Failed to create User Pool. Exiting setup")
    print (e)
    print_config(True)
    sys.exit(1)

#Create user pool client (get code to associate application with the user pool)
################################################################################
try:
    user_pool_client_response = cognito_identity_provider_client.create_user_pool_client(
        UserPoolId=config_data['userPoolId'],
        ClientName='PlotCriticClient',
        GenerateSecret=False
    )
    config_data['clientID'] = user_pool_client_response['UserPoolClient']['ClientId']
except Exception as e:
    print ("Error: Failed to create User Pool Client. Exiting setup")
    print (e)
    print_config(True)
    sys.exit(1)

#create identity pool
################################################################################
try:
    cognito_identity_pool_client = boto3.client('cognito-identity',
        aws_access_key_id=args.access_key_id,
        aws_secret_access_key=args.secret_access_key,
        region_name=config_data['region'],
        api_version='2014-06-30'
    )
    identity_pool_response = cognito_identity_pool_client.create_identity_pool(
        IdentityPoolName=config_data['projectName'] + 'PlotCriticIdentityPool',
        AllowUnauthenticatedIdentities=False,
        CognitoIdentityProviders=[
            {
                'ProviderName': user_pool_provider_name,
                'ClientId': config_data['clientID']
            }
        ]
    )
    config_data['identityPoolId'] = identity_pool_response['IdentityPoolId']
except dynamodb_client.exceptions.ResourceInUseException as e:
    print ("Error: A User Pool already exists with the name " + config_data['projectName'] + 'PlotCriticPool' + 
            ", generated for project name " + config_data['projectName'] + ".")
    print ("You may wish to change the name of this project (by changing the -p flag) to avoid overwriting a previous project.\n")
    print ("If you would rather remove the current project named " + config_data['projectName'] + 
            " you may do so using the AWS Console or with the `delete_project` script, using the config.json file created during setup.")
    print ("Ex. `python sv_plaudit/PlotCritic/delete_project.py -c sv_plaudit/PlotCritic/config.json -f`")
    print_config(True)
    sys.exit(1)
except Exception as e:
    print ("Error: Failed to create Identity Pool. Exiting setup")
    print (e)
    print_config(True)
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
          "cognito-identity.amazonaws.com:aud": config_data['identityPoolId']
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
    role_name = config_data['projectName'] + "PlotCriticRole" 
    iam_client = boto3.client('iam',
        aws_access_key_id=args.access_key_id,
        aws_secret_access_key=args.secret_access_key,
        api_version="2010-05-08",
        region_name=config_data['region']
    )
    iam_role_response = iam_client.create_role(
        RoleName=role_name,
        Path="/",
        AssumeRolePolicyDocument=json.dumps(policy),
        Description='PlotCritic role for ' + config_data['projectName']
    )
except Exception as e:
    print ("Error: Failed to create IAM Role. Exiting setup")
    print (e)
    print_config(True)
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
    print_config(True)
    sys.exit(1)


#add role to identity pool
################################################################################
try:
    add_role_to_identity_pool_response = cognito_identity_pool_client.set_identity_pool_roles(
        IdentityPoolId=config_data['identityPoolId'],
        Roles={
            'authenticated': iam_role_response['Role']['Arn']
        }
    )
except Exception as e:
    print ("Error: Failed to attach Role to Identity Pool. Exiting setup")
    print (e)
    print_config(True)
    sys.exit(1)

#create user in the user pool
#################################################################################
try:
    create_user_response = cognito_identity_provider_client.sign_up(
        ClientId=config_data['clientID'],
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
    print_config(True)
    sys.exit(1)

#write out the environment variables to env.js
#################################################################################
print_config(False)

#try:
#    env_header = "(function (window) {window.__env = window.__env || {};window.__env.config = "
#    env_obj = {"dynamoRegion" : config_data['dynamoRegion'],
#            "region" : config_data['dynamoRegion'],
#            "dynamoScoresTable" : config_data['dynamoScoresTable'],
#            "dynamoImagesTable" : config_data['dynamoImagesTable'],
#            "projectName" : config_data['projectName'],
#            "AWSBucketName" : config_data['AWSBucketName'],
#            "AWSBucketURl" : config_data['AWSBucketURL'],
#            "userPoolId" : config_data['userPoolId'],
#            "clientID" : config_data['clientID'],
#            "identityPoolId" : config_data['identityPoolId'],
#            "randomizeOrder" : args.randomize,
#            "curationQandA" : {
#                    "question": curation_question,
#                    "answers" : curation_answers
#            },
#            "reportFields" : args.report_fields,
#            "summaryFields" : args.summary_fields
#        }
#    env_footer = "}(this));"
#    rel_path = os.path.dirname(sys.argv[0])
#    with open(os.path.join(rel_path,"website/js/env.js"), 'w') as env_file:
#        env_file.write(env_header)
#        json.dump(env_obj, env_file)
#        env_file.write(env_footer)
#
#    env_obj['accessKey'] = args.access_key_id
#    env_obj['secretAccessKey'] = args.secret_access_key
#    with open(os.path.join(rel_path,"config.json"), 'w') as conf_file:
#        json.dump(env_obj, conf_file)
#except Exception as e:
#    print ("Error: Failed to write out config data: ")
#    print (env_obj)
#    print ("Exiting setup")
#    print (e)
#finally:
#    print_config()
#    sys.exit(1)

#upload the website code to S3 - apparently has to be done one file at a time
###############################################################################
try:
    s3_resource = boto3.resource('s3',
        aws_access_key_id=args.access_key_id,
        aws_secret_access_key=args.secret_access_key,
        api_version='2006-03-01',
        region_name=config_data['region']

    )
    rel_path = os.path.dirname(sys.argv[0])
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
                config_data['AWSBucketName'],
                key,
                ExtraArgs={
                    'ACL': 'public-read',
                    'ContentType' : content_type
                }
            )
except Exception as e:
    print ("Error: Failed to upload website to S3 bucket. Exiting setup")
    print (e)
    print_config(True)
    sys.exit(1)
