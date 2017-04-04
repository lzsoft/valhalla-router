'use strict';
async function init(req, res, environment, map) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT, GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', false);
    res.setHeader('Access-Control-Max-Age', '3600');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization');
    if (req.method === "OPTIONS") {
        res.statusCode = 200;
        res.end();
        return true;
    }
    if (map[req.url] && map[req.url][req.method]) {
        switch (true) {
            case (req.method === 'GET'):
                await map[req.url](environment, await processParam(req, res), async function(data, code, message) {
                    await end(req, res, data, code, message);
                });
                return true;
            case (req.headers['content-type'] === 'application/json'):
                await map[req.url](environment, await processJson(req, res), async function(data, code, message) {
                    await end(req, res, data, code, message);
                });
                return true;
            case (req.headers['content-type'] && req.headers['content-type'] !== 'application/json'):
                await map[req.url](environment, await processFile(req, res), async function(data, code, message) {
                    await end(req, res, data, code, message);
                });
                return true;
            default:
                res.statusCode = 406;
                res.statusMessage = "You must provide a valid content-type header";
                res.end();
                return false;
        }
    } else {
        res.statusCode = 404;
        res.statusMessage = "Service does not exist";
        res.end();
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
async function processParam(req, res) {
    return new Promise(function(resolve, reject) {
        try {
            resolve(req.query);
        } catch (e) {
            res.statusCode = 500;
            res.statusMessage = "Something goes wrong while parsing PARAM";
            res.end();
            reject(e);
        }
    });
}
async function end(req, res, data, code, message) {
    res.statusCode = code;
    res.statusMessage = message;
    if (typeof data === 'object') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
    } else {
        res.setHeader('Content-Type', 'text/plain');
        res.end(data);
    }
    return true;
}
exports.init = init;
