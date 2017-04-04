'use strict';
const url = require('url');
let req = null;
let res = null;
async function start(request, response, environment, map) {
    req = request;
    res = response;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT, GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', false);
    res.setHeader('Access-Control-Max-Age', '3600');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization');
    if (req.method === "OPTIONS") {
        end(200);
        return true;
    }
    let u = url.parse(req.url, true);
    if (map[u.pathname] && map[u.pathname][req.method]) {
        switch (true) {
            case (req.method === 'GET'):
                await map[u.pathname][req.method](environment, u.query);
                return true;
            case (req.headers['content-type'] === 'application/json'):
                await map[u.pathname][req.method](environment, await processJson());
                return true;
            case (req.headers['content-type'] && req.headers['content-type'] !== 'application/json'):
                await map[u.pathname][req.method](environment, await processFile());
                return true;
            default:
                end(406, "You must provide a valid content-type header");
                return false;
        }
    } else {
        res.statusCode = 404;
        res.statusMessage = "Service does not exist";
        res.end();
        return false;
    }
}
async function processJson() {
    return new Promise(function(resolve, reject) {
        try {
            let text = '';
            let json = {};
            req.on('data', (chunk) => {
                text += chunk;
            });
            req.on('end', () => {
                json = JSON.parse(text) || {};
                resolve(json);
            });
        } catch (e) {
            res.statusCode = 406;
            res.statusMessage = "The incoming JSON string is invalid";
            res.end();
            reject(e);
        }
    });
}
async function processFile() {
    return new Promise(function(resolve, reject) {
        try {
            let buffer = Buffer.alloc(0);
            req.on('data', (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);
            });
            req.on('end', () => {
                let file = {
                    buffer: buffer,
                    contentType: req.headers['content-type'],
                    contentCategory: req.headers['content-type'].split('/')[0]
                };
                resolve(file);
            });
        } catch (e) {
            res.statusCode = 500;
            res.statusMessage = "Something goes wrong while parsing FILE";
            res.end();
            reject(e);
        }
    });
}
async function end(code, message, data) {
    res.statusCode = code;
    res.statusMessage = message;
    if (data && typeof data === 'object') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
    } else {
        res.setHeader('Content-Type', 'text/plain');
        res.end(data);
    }
    return true;
}
exports.start = start;
exports.end = end;
exports.req = req;
exports.res = res;
