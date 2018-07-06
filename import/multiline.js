#!/usr/bin/env node

var program = require("commander");
var Log = require("log"),
    log = new Log("debug");
var AWS = require("aws-sdk");
var LineByLineReader = require("line-by-line");
var uuid = require("uuid");
var quotesTable = "quotes";
var commandsTable = "commands";

var awsRegion;
var importfile;
var category;
program
    .arguments("<aws region> <filename> <category>")
    .action(function(inRegion, inFilename, inCategory) {
	awsRegion = inRegion;
        importfile = inFilename;
        category = inCategory;
    })
    .parse(process.argv);

if (!program.args[0]) {
    program.outputHelp();
    process.exit();
}

log.info(`Importing ${importfile} to category ${category}`);

var documentClient = new AWS.DynamoDB.DocumentClient({ region: awsRegion, apiVersion: "2012-08-10" });

let lr = new LineByLineReader(importfile, {
    skipEmptyLines: true
});

lr.on("error", function (err) {
    log.error(`ERROR! ${err}`, err.stack);
    process.exit();
});

let total = 0;
let batchSize = 20;
let params = emptyParams();
lr.on("line", function (line) {
    // log.debug(line);

    if (line == "QUOTESTART") {

        let batchCount = params.RequestItems[quotesTable].length;
        if (batchCount >= batchSize) {
            log.info(`Sending ${batchCount} items`);
            total += batchCount;
            // log.debug(JSON.stringify(params));
    
            documentClient.batchWrite(params, function (err, data) {
                if (err) {
                    log.error(`ERROR! ${err}`, err.stack);
                    process.exit();
                } else {
                    log.debug(data);
                }
            });
    
            params = emptyParams();
        }

        let item = {
            PutRequest: {
                Item: {
                    "uuid": uuid.v4(),
                    "category": category,
                    "quote": ""
                }
            }
        };
        params.RequestItems[quotesTable].push(item);
    } else {
        let lastIndex = params.RequestItems[quotesTable].length - 1;
        params.RequestItems[quotesTable][lastIndex].PutRequest.Item.quote = 
            params.RequestItems[quotesTable][lastIndex].PutRequest.Item.quote.concat("\n", line);
    }

});

lr.on("end", function () {

    let batchCount = params.RequestItems[quotesTable].length;
    if (batchCount > 0) {
        log.info(`Ending with ${batchCount} items`);
        total += batchCount;

        documentClient.batchWrite(params, function (err, data) {
            if (err) {
                log.error(`ERROR! ${err}`, err.stack);
                process.exit();
            } else {
                log.debug(data);
            }
        });
    }

    if (total > 0) {
        params = {
            TableName: commandsTable,
            Key: {"command": `/${category.toLowerCase()}`},
            UpdateExpression: "set #cat = :cat",
            ExpressionAttributeNames: {"#cat": "category"},
            ExpressionAttributeValues: {":cat": category}
        };

        documentClient.update(params, function(err, data) {
            if (err) {
                log.error("Unable to update: ", JSON.stringify(err, null, 2));
            }
        });
    }

});

function emptyParams() {
    let p = {
        RequestItems: {}
    };
    p.RequestItems[quotesTable] = [];
    return p;
}
