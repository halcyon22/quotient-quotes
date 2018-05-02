#!/usr/bin/env node

var program = require("commander");
var Log = require("log"),
    log = new Log("debug");
var AWS = require("aws-sdk");
var ddb = new AWS.DynamoDB({ region: "us-east-1", apiVersion: "2012-08-10" });
var LineByLineReader = require("line-by-line");
var uuid = require("uuid");

let categories = {
    "chuck.txt": "ChuckNorris"
};

program
    .arguments("<filename>")
    .parse(process.argv);

if (!program.args[0]) {
    program.outputHelp();
    process.exit();
}
let importfile = program.args[0];

log.info(`Importing ${importfile}`);

let lr = new LineByLineReader(importfile);

lr.on("error", function (err) {
    log.error(`ERROR! ${err}`, err.stack);
    process.exit();
});

let batchSize = 20;
let params = emptyParams();
lr.on("line", function (line) {
    // log.debug(line);

    if (line == "QUOTESTART") {

        let batchCount = params.RequestItems["quotient-quotes"].length;
        if (batchCount >= batchSize) {
            log.info(`Sending ${batchCount} items`);
            // log.debug(JSON.stringify(params));
    
            ddb.batchWriteItem(params, function (err, data) {
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
                    "uuid": { "S": uuid.v4() },
                    "category": { "S": categories[importfile] },
                    "quote": { "S": "" }
                }
            }
        };
        params.RequestItems["quotient-quotes"].push(item);
    } else {
        let lastIndex = params.RequestItems["quotient-quotes"].length - 1;
        params.RequestItems["quotient-quotes"][lastIndex].PutRequest.Item["quote"]["S"] = 
            params.RequestItems["quotient-quotes"][lastIndex].PutRequest.Item["quote"]["S"].concat("\n", line);
    }

});

lr.on("end", function () {

    let batchCount = params.RequestItems["quotient-quotes"].length;
    if (batchCount > 0) {
        log.info(`Ending with ${batchCount} items`);

        ddb.batchWriteItem(params, function (err, data) {
            if (err) {
                log.error(`ERROR! ${err}`, err.stack);
                process.exit();
            } else {
                log.debug(data);
            }
        });
    
        params = emptyParams();
    }
});

function emptyParams() {
    return {
        RequestItems: {
            "quotient-quotes": [
            ]
        }
    };
}
