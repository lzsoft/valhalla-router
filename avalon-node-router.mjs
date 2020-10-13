import assert from "assert";
import querystring from "querystring";

Array.prototype.deepEqual = function (target) {
    if (this.length !== target.length) {
        return false;
    }
    for (let i = 0; i < this.length; i++) {
        if (this[i] !== target[i]) {
            return false;
        }
    }
    return true;
};

export default async function (req, res, map, {
    responseHeaders = {
        'Access-Control-Allow-Methods': 'GET, OPTION, POST, PUT, DELETE',
        'Access-Control-Max-Age': '3600',
        'Access-Control-Allow-Headers': 'Origin, Referer, Content-Type, Accept'
    },
    alwaysApproveOptionsRequest = true
}) {

    assert.ok(req, new Error("Req method must be provided as the 1st param"));
    assert.ok(res, new Error("Res method must be provided as the 2nd param"));
    assert.ok(map, new Error("Router map must be provided as the 3rd param"));

    for (const h in responseHeaders) {
        res.setHeader(h, responseHeaders[h]);
    }

    if (req.method === "OPTIONS" && alwaysApproveOptionsRequest) {
        end(null, 200);
        return true;
    }

    const url = new URL(req.url, 'http://127.0.0.1');

    const pathnameArrayFromRequest = url.pathname.split("/");

    for (const pathnameDefinition in map) {
        const pathnameArrayFromDefinition = pathnameDefinition.split("/");
        if (pathnameArrayFromRequest.deepEqual(pathnameArrayFromDefinition) && map[pathnameDefinition][req.method]) {
            switch (true) {
                case (req.method === "GET"):
                    await map[pathnameDefinition][req.method](req, res, end, querystring.parse(url.search.substr(1)));
                    return true;
                case (req.headers['content-type'] === "application/json"):
                    await map[pathnameDefinition][req.method](req, res, end, await processJson(req));
                    return true;
                case (req.headers['content-type'] === "text/plain"):
                    await map[pathnameDefinition][req.method](req, res, end, await processText(req));
                    return true;
                default:
                    await map[pathnameDefinition][req.method](req, res, end);
                    return true;
            }
        }
    }

    end(null, 404);

    function end(data, statusCode = 200, statusMessage = undefined) {
        res.statusCode = statusCode;
        res.statusMessage = statusMessage;
        switch (true) {
            case data === null:
            case data === undefined:
                res.setHeader("Content-Type", "text/plain");
                res.end();
                break;
            case typeof data === "object":
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(data));
                break;
            default:
            case typeof data === "string":
            case typeof data === "number":
                res.setHeader("Content-Type", "text/plain");
                res.end(data.toString());
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
            try {
                json = JSON.parse(text);
                resolve(json);
            } catch (e) {
                reject(new Error("The request claims to be application/json but the body is not a valid JSON. Body: " + text));
            }
        }).on('error', e => {
            reject(e);
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
            reject(e);
        });
    });
}