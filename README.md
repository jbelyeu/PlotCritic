# sveee
Contains code for both the [website](http://home.chpc.utah.edu/~u1072557/sveee/sveee.html) and data retrieval script for sveee.
Purpose of the tool is to simplify creation of a high-quality truth set of structural variants.
Web page displays image files of read alignments for visual scoring and sends scores to DynamoDB back end.

### Website Deployment
Prep
1. Create an AWS DynamoDB instance 
    * Go to https://console.aws.amazon.com/dynamodb
    * Select “Create table”
    * Enter a name for the table, set partition key name to “identifier” and type to string
    * When table creation is finished, take note of the table region from the “Overview” page (use the format given in the colon-separated list “ARN”, after dyanmodb). Ex. `us-east-1` from `arn:aws:dynamodb:us-east-1:884584281121:table/sveee`
2. Create restricted-access user for Dynamo instance
    * Go to https://console.aws.amazon.com/iam
    * Select “Add user”
    * Enter name for user
    * Check "Programmatic access” box for “Access type"
    * Click "Next"
    * Select “Attach existing policies directly”, then choose “AmazonDynamoDBFullAccess” and “AmazonAPIGatewayInvokeFullAccess” from list 
    * Click “Next: Review, then “Create user”
    * Take note of the access key and secret access key that are created with the user
3. Create an AWS bucket and add the images you wish to display
    * Go to https://s3.console.aws.amazon.com/s3
    * Click "Create bucket"
    * Enter bucket name and choose region
    * Set desired properties 
    * Set public read access permission
    * Create bucket
    * Select bucket from list
    * Select "Create folder" and type in desired folder name
    * Select "Permissions" tab and add "Read bucket permissions" to "Everyone"
    * Create bucket and upload files. When uploading, make sure to grant public read access



### Retrieval Script
Python script "retrieval.py" retrieves data from the DynamoDB table and, currently, prints it out.
Must install python library boto3 (available from conda).
It requires an AWS config file (by default "~/.aws/credentials").
That config file follows the following format (use the credentials created during website deployment):

```
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_ACCESS_KEY_SECRET
```
