import assert from "assert";
import querystring from "querystring";

export default async function (req, res, map, options = {
    responseHeaders: {
        'Access-Control-Allow-Methods': 'GET, OPTION, POST, PUT, DELETE',
        'Access-Control-Max-Age': '3600',
        'Access-Control-Allow-Headers': 'Origin, Referer, Content-Type, Accept'
    },
    alwaysApproveOptionsRequest: true
}) {

    assert.ok(req, new Error("Req method must be provided as the 1st param"));
    assert.ok(res, new Error("Res method must be provided as the 2nd param"));
    assert.ok(options, new Error("Options object must be provided as the 3rd param"));
    assert.ok(map, new Error("Router map must be configured in options object"));

    for (const h in responseHeaders) {
        res.setHeader(h, responseHeaders[h]);
    }

    if (req.method === "OPTIONS" && alwaysApproveOptionsRequest) {
        end(null, 200);
        return true;
    }

    const url = new URL(req.url, 'http://127.0.0.1');

    const pathnameArrayFromRequest = url.pathname.split("/");
    const pathnameArrayFromRequestString = JSON.stringify(pathnameArrayFromRequest);

    for (const pathnameDefinition in map) {
        const pathnameArrayFromDefinition = pathnameDefinition.split("/");
        if (JSON.stringify(pathnameArrayFromDefinition) === pathnameArrayFromRequestString && map[pathnameDefinition][req.method]) {
            switch (true) {
                case (req.method === "GET"):
                    await map[pathnameDefinition][req.method](req, res, end, querystring.parse(url.search.substr(1)));
                    return true;
                case (req.headers['content-type'] === "application/json"):
                    await routerMap[p][req.method](req, res, end, await processJson(req));
                    return true;
                case (req.headers['content-type'] === "text/plain"):
                    await routerMap[p][req.method](req, res, end, await processText(req));
                    return true;
                default:
                    await routerMap[p][req.method](req, res, end);
                    return true;
            }
        }
    }

    end(null, 404);

    function end(body, statusCode = 200, statusMessage = undefined) {
        res.statusCode = statusCode;
        res.statusMessage = statusMessage;
        switch (true) {
            case body === null:
            case body === undefined:
                res.setHeader("Content-Type", "text/plain");
                res.end();
                break;
            case typeof body === "object":
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(body));
                break;
            default:
            case typeof body === "string":
            case typeof body === "number":
                res.setHeader("Content-Type", "text/plain");
                res.end(body);
                break;
        }
        return true;
    }
};

async function processJson(req) {
    return new Promise(function (resolve, reject) {
        let text = '';
        let json = {};
        req.on('data', chunk => {
            text += chunk;
        }).on('end', () => {
            json = JSON.parse(text);
            resolve(json);
        }).on('error', e => {
            reject(new Error('Error while processing JSON in request body'));
        });
    });
}

async function processText(req) {
    return new Promise(function (resolve, reject) {
        let text = '';
        req.on('data', chunk => {
            text += chunk;
        }).on('end', () => {
            resolve(text);
        }).on('error', e => {
            reject(new Error('Error while processing TEXT in request body'));
        });
    });
}