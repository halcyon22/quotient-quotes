# quotient-quotes
A simple quote bot for Slack built with AWS Lambda and DynamoDB.

## Lambda Function
`lambda/index.js` has been tested with Node.js 6.10 and 8.10.

1. Create a function from scratch.
1. Choose a Node.js runtime.
1. Create a new role from template with any name.
1. Choose the "Simple Microservice permissions" Policy template.

It will be given permission to:
1. Write CloudWatch logs. Example:
   * `arn:aws:logs:us-east-1:<YOUR ACCOUNT ID>:* => Allow: logs:CreateLogGroup`
   * `arn:aws:logs:us-east-1:<YOUR ACCOUNT ID>:log-group:/aws/lambda/quotient:* => Allow: logs:CreateLogStream, Allow: logs:PutLogEvents`
1. Read/write to DynamoDB. Example:
   * `arn:aws:dynamodb:us-east-1:<YOUR ACCOUNT ID>:table/quotes => Allow: dynamodb:DeleteItem, Allow: dynamodb:GetItem, Allow: dynamodb:PutItem, Allow: dynamodb:Scan, Allow: dynamodb:UpdateItem`

### Designer
1. Under Designer > Add Triggers, choose API Gateway.
1. Set Configure triggers > API to Create a new API
1. Set Configure triggers > API name to something that matches your function.
1. Set Configure triggers > Deployment stage to e.g. "dev".
1. Set Configure triggers > Security to Open.

### Function code
Paste the contents of index.js into the editor.

### Environment Variables
* `APP_TOKEN` - Slack verification token.
* `COMMANDS_TABLENAME` - name of the DynamoDB table that stores the command mappings.
* `QUOTES_TABLENAME` - name of the DynamoDB table that stores quotes.
* `IS_DEBUG` - true/false - writes debug output to CloudWatch log.

## DynamoDB
The Lambda function depends on two DynamoDB tables:
* `commands` maps a Slack slash-command to a category. The `command` field is the primary key. Example item:
```
{
    "command": "/chucknorris",
    "category": "ChuckNorris"
}
```

* `quotes` stores all the quotes. The `uuid` field is the primary key. Example item:
```
{
    "uuid": "81f05bc0-615e-4a88-88a8-66e7144fc8e5",
    "category": "ChuckNorris",
    "quote": "Chuck Norris invented Kentucky Fried Chicken's famous secret recipe, with eleven herbs and spices. But nobody ever mentions the twelfth ingredient: Fear."
}
```

## API Gateway
Creating the API Gateway trigger should have setup the resource and stage that you defined.

Deploy the resource.

## Slack
Create a Slack bot.

Make a Bot user, giving it any name. Turn on "Always Show My Bot as Online".

For the Lambda function environment variable `APP_TOKEN`, use the value of Slack > [Your Bot] > Basic Information > App Credentials > Verification Token.

Create slash commands that point to the desired API Gateway stage. The Request URL can be found in API Gateway > [Your API] Stages > [Stage] > Invoke URL.
