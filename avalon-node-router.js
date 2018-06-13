'use strict';
const url = require('url');
const querystring = require('querystring');
exports.start = async function(req, res, environment, map, headers) {
	res.setHeader('Access-Control-Allow-Methods', 'GET, OPTION, POST, PUT, DELETE, PATCH');
	res.setHeader('Access-Control-Max-Age', '3600');
	res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization');
	//
	for (const h in headers) {
		res.setHeader(h, headers[h]);
	}
	//
	res.anrEnd = function(statusCode, statusMessage, body, headers) {
		res.statusCode = statusCode;
		res.statusMessage = statusMessage;
		if (body && typeof body === 'object') {
			res.setHeader('Content-Type', headers ? headers['content-type'] || headers['Content-Type'] || 'application/json' : 'application/json');
			res.end(JSON.stringify(body));
		} else if (body) {
			res.setHeader('Content-Type', headers ? headers['content-type'] || headers['Content-Type'] || 'text/plain' : 'text/plain');
			res.end(body);
		} else {
			res.setHeader('Content-Type', headers ? headers['content-type'] || headers['Content-Type'] || 'application/octet-stream' : 'application/octet-stream');
			res.end(body);
		}
		return true;
	};
	if (req.method === "OPTIONS") {
		res.anrEnd(200);
		return true;
	}
	let u = new url.URL(req.url, 'http://127.0.0.1');
	let p = null;
	for (const m in map) {
		if (u.pathname.indexOf(m) === 0) {
			let up = u.pathname.replace(m, '');
			if (up[0] === '/' || up[0] === '#' || up[0] === '?' || !up[0]) {
				p = m;
			}
		}
	}
	if (p && map[p][req.method]) {
		switch (true) {
			case (req.method === 'GET'):
				await map[p][req.method](req, res, environment, querystring.parse(u.search.substr(1)));
				return true;
			case (req.headers['content-type'] && req.headers['content-type'] === 'application/json'):
				await map[p][req.method](req, res, environment, await processJson(req, res));
				return true;
			case (req.headers['content-type'] && req.headers['content-type'] !== 'application/json'):
				await map[p][req.method](req, res, environment, await processFile(req, res));
				return true;
			default:
				res.anrEnd(406, "You must provide a valid content-type header");
				return false;
		}
	} else {
		res.anrEnd(404, "Service does not exist");
		return false;
	}
};
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