# sveee
Contains code for both the [website](http://home.chpc.utah.edu/~u1072557/sveee/sveee.html) and data retrieval script for sveee.
Purpose of the tool is to simplify creation of a high-quality truth set of structural variants.
Web page displays image files of read alignments for visual scoring and sends scores to DynamoDB back end.

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

3. **Under development (upload images to S3)



## More Options (Also under development)
### Retrieval Script
Python script "retrieval.py" retrieves data from the DynamoDB table and prints it out as tab-separated lines.

### Delete Project
