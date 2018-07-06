var querystring = require("querystring");
var AWS = require("aws-sdk"),
	documentClient = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
    if (event.body === null || event.body === undefined) {
        return errorResponse(callback, "Event body not found");
    }
    
    debugLog(event.body);
    
    let body = querystring.parse(event.body);
    if (body.token !== process.env.APP_TOKEN) {
        return errorResponse(callback, `Invalid app token: ${body.token}`);
    }
    
    let categoryPromise = lookupCategory(body.command)
    .catch(function(err) {
        errorResponse(callback, err);
    });

    let randomQuotePromise = categoryPromise
    .then(category => loadQuotes(category))
    .then(allQuotes => filterByLeastUsed(allQuotes))
    .then(leastUsedQuotes => pickRandomQuote(leastUsedQuotes))
    .catch(function(err) {
        errorResponse(callback, err);
    });
    
    randomQuotePromise
    .then(quote => incrementUsed(quote))
    .catch(function(err) {
        errorResponse(callback, err);
    });
    
    Promise.all([categoryPromise, randomQuotePromise])
    .then(function(resultsArray) {
        let category = resultsArray[0];
        let quote = resultsArray[1];
        respondToSlack(category, quote, callback);
    })
    .catch(function(err) {
        errorResponse(callback, err);
    });
};

function lookupCategory(command) {
    return new Promise(function(resolve, reject) {
        debugLog(`lookupCategory(${command})`);
        
    	let params = {
    		TableName: process.env.COMMANDS_TABLENAME,
    	    FilterExpression: "#cmd = :cmd",
            ExpressionAttributeNames: {'#cmd': 'command'},
    	    ExpressionAttributeValues: {":cmd": command}
    	};
    
        debugLog(`params=${JSON.stringify(params)}`);
    	
    	documentClient.scan(params).promise()
    	.then(function (data) {
    	    debugLog(`found ${data.Items.length} items`);
    	    
    	    if (data.Items.length > 0) {
    	        resolve(data.Items[0].category);
    	    } else {
    	        reject(`Category not found for ${command}`);
    	    }
    	});
    });
}

function loadQuotes(category) {
    return new Promise(function(resolve, reject) {
        debugLog(`loadQuotes(${category})`);
        
    	let params = {
    		TableName: process.env.QUOTES_TABLENAME
    	};
    
    	if (category) {
    	    params.FilterExpression = "#cat = :cat";
            params.ExpressionAttributeNames = {'#cat': 'category'};
    	    params.ExpressionAttributeValues = {":cat": category};
    	}
    
        debugLog(`params=${JSON.stringify(params)}`);
    
        documentClient.scan(params).promise()
        .then(function(data) {
    	    debugLog(`found ${data.Items.length} quotes`);
    	    
    	    if (data.Items.length > 0) {
                resolve(data.Items);
    	    } else {
    	        reject(`No quotes found for category: ${category}`);
    	    }
        });
    });
}

function filterByLeastUsed(quotes) {
    if (quotes.length < 1) {
        return quotes;
    }
    
    let leastUsedCount = quotes.map(quote =>
        quote.used ? quote.used : 0
    ).reduce((previous, current) =>
        current < previous ? current : previous
    );
    
    let leastUsedQuotes = quotes.filter(quote =>
       quote.used == undefined || quote.used == leastUsedCount
    );
    
    debugLog(`leastUsed count=${leastUsedQuotes.length}`);
    
    return leastUsedQuotes;
}

function pickRandomQuote(quotes) {
    if (quotes.length < 1) {
        return undefined;
    }
    
    let randomIndex = Math.floor(Math.random() * quotes.length);
    let randomLeastUsed = quotes[randomIndex];
    
    debugLog(`picked "${JSON.stringify(randomLeastUsed)}"`);
    return randomLeastUsed;
}

function respondToSlack(chosenCategory, quote, callback) {
    debugLog(`chosenCategory=${chosenCategory}`);
    debugLog(`responding with=${JSON.stringify(quote)}`);
    
    if (quote == undefined) {
        quote = {
            category: 'N/A',
            quote: 'No quote found.'
        };
    }
    if (!chosenCategory) {
        quote = `[${quote.category}] ${quote.quote}`;
    }
    quoteResponse(callback, quote.quote);
}

function incrementUsed(quote) {
    if (quote == undefined) {
        return;
    }
    debugLog(`quote to increment: ${JSON.stringify(quote)}`);
    
    let newValue = quote.used ? quote.used + 1 : 1;
    
    let updateparams = {
        TableName: process.env.QUOTES_TABLENAME,
        Key: {"uuid": quote.uuid},
        UpdateExpression: "set #used = :used",
        ExpressionAttributeNames: {"#used": "used"},
    	ExpressionAttributeValues: {":used": newValue}
    };

    documentClient.update(updateparams, function(err, data) {
        if (err) {
            console.error("Unable to update: ", JSON.stringify(err, null, 2));
        }
    });
}

function quoteResponse(callback, responseText) {
    let responseBody = {
        "response_type": "in_channel",
        "text": responseText
    };
    let response = {
        statusCode: 200,
        headers: {
            "Content-type" : "application/json"
        },
        body: JSON.stringify(responseBody)
    };
    
    debugLog(JSON.stringify(response));
    
    callback(null, response);
    return;
}

function errorResponse(callback, body) {
    console.error(body);
    let response = {
        statusCode: 400,
        headers: {
            "Content-type" : "text/plain"
        },
        body: body
    };
    callback(null, response);
    return;
}

function debugLog(statement) {
    if (process.env.IS_DEBUG === "true") {
        console.log(statement);
    }
}