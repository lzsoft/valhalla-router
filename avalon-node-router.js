'use strict';
const url = require('url');
const URL = url.URL;
const querystring = require('querystring');
async function start(req, res, environment, map) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', false);
    res.setHeader('Access-Control-Max-Age', '3600');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization');
    res.anrEnd = function(code, message, data, contentType) {
        res.statusCode = code;
        res.statusMessage = message;
        if (data && typeof data === 'object') {
            res.setHeader('Content-Type', contentType || 'application/json');
            res.end(JSON.stringify(data));
        } else if (data) {
            res.setHeader('Content-Type', contentType || 'text/plain');
            res.end(data);
        } else {
            res.setHeader('Content-Type', contentType || 'application/octet-stream');
            res.end(data);
        }
        return true;
    };
    if (req.method === "OPTIONS") {
        res.anrEnd(200);
        return true;
    }
    let u = new URL(req.url, 'http://127.0.0.1');
    if (map[u.pathname] && map[u.pathname][req.method]) {
        switch (true) {
            case (req.method === 'GET'):
                await map[u.pathname][req.method](req, res, environment, querystring.parse(u.search.substr(1)));
                return true;
            case (req.headers['content-type'] === 'application/json'):
                await map[u.pathname][req.method](req, res, environment, await processJson(req, res));
                return true;
            case (req.headers['content-type'] && req.headers['content-type'] !== 'application/json'):
                await map[u.pathname][req.method](req, res, environment, await processFile(req, res));
                return true;
            default:
                res.anrEnd(406, "You must provide a valid content-type header");
                return false;
        }
    } else {
        res.anrEnd(404, "Service does not exist");
        return false;
    }
}
async function processJson(req, res) {
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
async function processFile(req, res) {
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
exports.start = start;