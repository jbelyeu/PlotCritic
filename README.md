# PlotCritic
Contains code for PlotCritic, a user-friendly and easily deployed tool for image scoring, supported by AWS backend resources.

## Website Deployment
Prep:

1. If you don't already have one, create an [AWS account](https://portal.aws.amazon.com/gp/aws/developer/registration/index.html), then use it to make a dedicated [IAM user](http://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html#id_users_create_console) with the following permissions:
   * IAMFullAccess
   * AmazonS3FullAccess
   * AmazonDynamoDBFullAccess
   * AmazonCognitoPowerUser
Take note of the Access Key ID and Secret Access Key created for your IAM User.

2. Clone PlotCritic repo, cd into it, and run the following command (substituting your own fields):
```
python plotcritic_setup.py \
	-p "PROJECT_NAME" \
	-e "YOUR_EMAIL" \
	-a "ACCESS_KEY_ID" \
	-s "SECRET_ACCESS_KEY"
```
You will receive an email with the URL for your new website, with a confirmation code to log in.

3. Upload images to S3. If using PlotCritic as part of the [SV-Plaudit](https://github.com/jbelyeu/SV-Plaudit) pipeline, refer to that repository for upload instructions.



## More Options
### Retrieval Script
The `retrieval.py` script retrieves data from the DynamoDB table and prints it out as tab-separated lines, allowing you to create custom reports.

Usage:
```
python retrieval.py 
```

The `-f` (filters) option allows you to pass in key-value pairs to filter the results. 
The following example shows only results from a project named "my_project":
```
python retrieval.py  -f "project","my_project"
```

### Delete Project
The `delete_project.py` script allows you to delete a project to clean up after finishing, using configuration information from the config.json file created during setup. 

Usage:
```
python delete_project.py 
```

If `-f` (full-deletion) option is not selected, you can choose to keep various resources, such as the S3 bucket containing your images and the DynamoDB tables with scoring results. If `-f` is selected, however, all external resources will be deleted permanently.
The following example deletes the entire project and all related resources:
```
python delete_project.py -f
```

### HTTPS
For additional security, use AWS Cloudfront to deploy with an SSL certificate through the Amazon Credential Manager (ACM). Further instructions available [here](http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/GettingStarted.html).
