# quotient-quotes
A simple quote bot for Slack built with AWS Lambda and DynamoDB.

## Lambda Function
`lambda/index.js` was written with runtime Node.js 6.10. It must have permission to:
1. Write CloudWatch logs. Example:
   * `arn:aws:logs:us-east-1:<YOUR ACCOUNT ID>:* => Allow: logs:CreateLogGroup`
   * `arn:aws:logs:us-east-1:<YOUR ACCOUNT ID>:log-group:/aws/lambda/quotient:* => Allow: logs:CreateLogStream, Allow: logs:PutLogEvents`
1. Read/write to DynamoDB. Example:
   * `arn:aws:dynamodb:us-east-1:<YOUR ACCOUNT ID>:table/quotient* => Allow: dynamodb:DeleteItem, Allow: dynamodb:GetItem, Allow: dynamodb:PutItem, Allow: dynamodb:Scan, Allow: dynamodb:UpdateItem`

### Environment Variables
* `COMMANDS_TABLENAME` - name of the DynamoDB table that stores the command mappings.
* `QUOTES_TABLENAME` - name of the DynamoDB table that stores quotes.
* `APP_TOKEN` - Slack app token.
* `IS_DEBUG` - true/false - writes debug output to CloudWatch log.

### Versioning
Create a version. Create an alias to that version. Set the alias name in the API Gateway stage variable `quotient_version_alias` to simplify making changes to the function without affecting callers.

## DynamoDB
The Lambda function depends on two DynamoDB tables:
* `quotient-commands` maps a Slack slash-command to a category. The `command` field is the primary key. Example item:
```
{
    "command": "/chucknorris",
    "category": "ChuckNorris"
}
```

* `quotient-quotes` stores all the quotes. The `uuid` field is the primary key. Example item:
```
{
    "uuid": "81f05bc0-615e-4a88-88a8-66e7144fc8e5",
    "category": "ChuckNorris",
    "quote": "Chuck Norris invented Kentucky Fried Chicken's famous secret recipe, with eleven herbs and spices. But nobody ever mentions the twelfth ingredient: Fear."
}
```

## API Gateway
`/quote` resource with method `POST`. 
* Integration type: Lambda Function
* Use Lambda Proxy integration: Yes
* Lambda Function: `<lambda function name>:${stageVariables.quotient_version_alias}`

Add the permission as noted by the popup, replacing `${stageVariables.quotient_version_alias}` with the actual Lambda function alias.

Deploy the API. Create a stage for the deployment. Add a Stage Variable `quotient_version_alias` with the actual Lambda function alias.

## Deploying a new version
1. Create a new Version of the Lambda function.
1. Move the alias to the new Version.

## Testing the $LATEST version
1. Create a Lambda function alias, e.g. `LATEST`
1. Point the `LATEST` alias to the `$LATEST` version.
1. Create an API Gateway Stage, e.g. `dev`
1. Add a Stage Variable `quotient_version_alias` with `LATEST`.

## Slack
Create a Slack bot. Put the App Token in the Lambda function environment variable `APP_TOKEN`. Create slash commands that point to the desired API Gateway stage.