# PlotCritic
PlotCritic is a user-friendly and easily deployed tool for image scoring, supported by AWS backend resources for security and easy scaling.

## Website Deployment
If you don't already have one, create an [AWS account](https://portal.aws.amazon.com/gp/aws/developer/registration/index.html).

The following instructions give detailed help on createing the IAM User, accurate as of February 2018. AWS at times updates the Console UI, so if we're behind in updating these instructions at any time refer to AWS resources for help ([IAM Policy](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_create.html), [IAM user](http://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html#id_users_create_console)).

Create a new IAM Policy by opening the [IAM console](https://console.aws.amazon.com/iam/home#/home), selecting 'Policies' from the left side navigation bar, and then clicking 'Create Policy'. Switch to the JSON editor window and paste in the following Policy definition:
```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "iam:PassRole",
                "iam:CreateRole",
                "iam:AttachRolePolicy",
                "iam:ListAttachedRolePolicies",
                "iam:DetachRolePolicy",
                "iam:DeleteRole"
            ],
            "Resource": "*"
        }
    ]
}
```
Click 'Review Policy', add a name (Ex. 'PlotCritic__Policy'), optionally a description, then click 'Create policy'.

Select 'Users' from the left navigation bar, then 'Add user'. Add a name for the user (Ex. 'PlotCritic_User'), click the radio button for 'Programmatic access', then 'Next: Permissions'. 

Choose 'Attach existing policies directly' and select the following policies:
   * AmazonS3FullAccess
   * AmazonDynamoDBFullAccess
   * AmazonCognitoPowerUser
   * Your new policy (Ex. 'PlotCritic__Policy')
   
Click 'Create user' and take note of the Access Key ID and Secret Access Key created for your IAM User. The Secret Access Key will not be available later, so you must record it at this point. 

Run the following command (substituting your own fields):
```
python PlotCritic/setup.py -p temp -e jrbelyeu@gmail.com -a [ACCESS_KEY_ID] -s [SECRET_ACCESS_KEY] -q "Does evidence in the sample support the variant called?" -A "s","Supports" "n","Does not support" "d","De novo" -r
```

The arguments used above are:
`-p` A project name (must be unique)

`-e` The email address of the user managing the project. You must be able to access this email account to use the website

`-a` The access key ID generated when you created your AWS user

`-s` The secret access key generated when you creates your AWS user

`-q` A curation question to display in the website for scoring images

`-A` The curation answers to display in the website for scoring images (must follow the example above, with a one-letter code and an answer for each entry, separated with commas and separated from other entries with spaces)

`-r` Flag to randomize the display order of images in the PlotCritic website on reload. If ommitted images display in the same order each time

If the curation question and answers are not set, defaults are as follows:

```
Question:
"Does the top sample support the variant type shown? If so, does it appear to be a de novo mutation? Choose one answer from below or type the corresponding letter key."

Answers:
"s","Supports" "n","Does not support" "d","De novo"
```

You will receive an email with the URL for your new website, with a confirmation code to log in. This script creates a configuration file `config.json` within the PlotCritic directory that later scripts require.

## Uploading images
Upload images from a directory on your local machine to S3. Uses `config.json`, which was created by the `PlotCritic/setup.py` script.
```
python upload.py -d [your_directory] -c [config_file]
```

## Score images
This section is still under development

## Retrieve scores and analyze results
The `retrieval.py` script retrieves data from the DynamoDB table and prints it out as tab-separated lines, allowing you to create custom reports. Uses `config.json`. Results are stored in a tab-separated file.

Usage:
```
python PlotCritic/retrieval.py -c [config_file] > retrieved_data.csv
```

The `-f` (filters) option allows you to pass in key-value pairs to filter the results. 
The following example shows only results scored by a user with the email address "me@email.com":
```
python PlotCritic/retrieval.py  -f "email","me@email.com" -c PlotCritic/config.json > retrieved_data.csv
```

### Additional options
#### Deleting a project
The `delete_project.py` script allows you to delete a project to clean up after finishing, using configuration information from the `config.json` file. 

Usage:
```
python PlotCritic/delete_project.py -c [config_file]
```

If `-f` (full-deletion) option is not selected, you can choose to keep various resources, such as the S3 bucket containing your images and the DynamoDB tables with scoring results. If `-f` is selected, however, all external resources will be deleted permanently.
The following example deletes the entire project and all related resources:
```
python PlotCritic/delete_project.py -f -c [config_file]
```

#### HTTPS
For additional security, use AWS Cloudfront to deploy with an SSL certificate through the Amazon Credential Manager (ACM). Further instructions available [here](http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/GettingStarted.html).
