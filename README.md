# sveee
Contains code for both the website and data retrieval script for sveee.
Purpose of the tool is to simplify creation of a high-quality truth set of structural variants.
Web page displays image files of read alignments for visual scoring and sends scores to DynamoDB back end.

Python script "retrieval.py" retrieves data from the DynamoDB table and, currently, prints it out.
It requires an AWS config file (by default referred to as ~/.aws/credentials).
That config file follows the following format:

```
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_ACCESS_KEY_SECRET
```
