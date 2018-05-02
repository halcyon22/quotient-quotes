var querystring = require("querystring");
var AWS = require("aws-sdk"),
	documentClient = new AWS.DynamoDB.DocumentClient();

var categories = {
    "/quote": undefined,
    "/chucknorris": "ChuckNorris"
};

exports.handler = (event, context, callback) => {
    if (event.body === null || event.body === undefined) {
        return errorResponse(callback, "Event body not found");
    }
    
    if (isDebugMode()) {
        console.log(event.body);
    }
    
    let body = querystring.parse(event.body);
    if (body.token !== process.env.APP_TOKEN) {
        return errorResponse(callback, "Invalid app token");
    }
    
    respondWithQuote(callback, categories[body.command]);
};

function respondWithQuote(callback, category) {
	let params = {
		TableName: process.env.TABLENAME
	};

	if (category) {
	    params.FilterExpression = "#cat = :cat";
        params.ExpressionAttributeNames = {'#cat': 'category'};
	    params.ExpressionAttributeValues = {":cat": category};
	}

    if (isDebugMode()) {
        console.log(`params=${JSON.stringify(params)}`);
    }

	documentClient.scan(params, function(err, data) {
    	if (err) {
    	    console.error(JSON.stringify(err));
    	} else {
    	    if (isDebugMode()) {
    	        console.log(JSON.stringify(data));
    	    }
    	    
    	    if (data.Items && data.Items.length > 0) {
    	        
                let leastUsedQuotes = filterByLeastUsed(data.Items);
                
                let randomIndex = Math.floor(Math.random() * leastUsedQuotes.length);
                let randomLeastUsed = leastUsedQuotes[randomIndex];
                let quote = randomLeastUsed.quote;
                if (!category) {
                    quote = `[${randomLeastUsed.category}] ${quote}`;
                }
    	        jsonResponse(callback, quote);
    	        
    	        incrementUsed(randomLeastUsed);
    	    } else {
    	        jsonResponse(callback, `No quotes found in category ${category}`);
    	    }
    	}
    });
}

function filterByLeastUsed(quotes) {
    let leastUsedCount = quotes.map(function (quote) {
        return quote.used ? quote.used : 0;
    }).reduce(function (previous, current) {
        if (current < previous) {
            return current;
        } else {
            return previous;
        }
    });
    
    let leastUsedQuotes = quotes.filter(function (quote) {
       return quote.used == undefined || quote.used == leastUsedCount;
    });
    return leastUsedQuotes;
}

function incrementUsed(quote) {
    let newValue = quote.used ? quote.used + 1 : 1;
    
    let updateparams = {
        TableName: process.env.TABLENAME,
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

function jsonResponse(callback, responseText) {
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
    
    if (isDebugMode()) {
        console.log(JSON.stringify(response));
    }
    
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

function isDebugMode() {
    return process.env.IS_DEBUG === "true";
}
