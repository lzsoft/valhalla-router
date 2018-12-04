const {
	URL
} = require('url');
const querystring = require('querystring');
exports.start = async function(req, res, routerMap, responseHeaders) {
	// Default response headers
	res.setHeader('Access-Control-Allow-Methods', 'GET, OPTION, POST, PUT, DELETE, PATCH');
	res.setHeader('Access-Control-Max-Age', '3600');
	res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization');
	// Custom response headers
	for (const h in responseHeaders) {
		res.setHeader(h, responseHeaders[h]);
	}
	//
	res.anrEnd = function(statusCode, body = {}, headers) {
		res.statusCode = statusCode;
		switch (typeof body) {
			case "object":
				res.setHeader('Content-Type', headers ? headers['content-type'] || headers['Content-Type'] || 'application/json' : 'application/json');
				res.end(JSON.stringify(body));
				break;
			case "string":
				res.setHeader('Content-Type', headers ? headers['content-type'] || headers['Content-Type'] || 'text/plain' : 'text/plain');
				res.end(body);
				break;
			default:
				res.setHeader('Content-Type', headers ? headers['content-type'] || headers['Content-Type'] || 'application/octet-stream' : 'application/octet-stream');
				res.end(body);
				break;
		}
		return true;
	};
	// OPTION method auto succeed
	if (req.method === "OPTIONS") {
		res.anrEnd(200);
		return true;
	}
	// Start router mapping
	let u = new URL(req.url, 'http://127.0.0.1');
	let p = null;
	for (const m in routerMap) {
		if (u.pathname.indexOf(m) === 0) {
			let up = u.pathname.replace(m, '');
			if (up[0] === '/' || up[0] === '#' || up[0] === '?' || !up[0]) {
				p = m;
			}
		}
	}
	// Handler hit
	if (p && routerMap[p][req.method]) {
		switch (true) {
			case (req.method === 'GET'):
				await routerMap[p][req.method](req, res, querystring.parse(u.search.substr(1)));
				return true;
			case (req.headers['content-type'] && req.headers['content-type'] === 'application/json'):
				await routerMap[p][req.method](req, res, await processJson(req, res));
				return true;
			case (req.headers['content-type'] && req.headers['content-type'] !== 'application/json'):
				await routerMap[p][req.method](req, res);
				return true;
			default:
				res.anrEnd(400, "You must provide a valid content-type header");
				return false;
		}
	} else {
		res.anrEnd(496, 'Request path or method is undefined');
		return false;
	}
};
async function processJson(req) {
	return new Promise(function(resolve, reject) {
		let text = '';
		let json = {};
		req.on('data', chunk => {
			text += chunk;
		});
		req.on('end', () => {
			try {
				json = JSON.parse(text) || {};
				resolve(json);
			} catch (e) {
				reject(new Error('Incoming request is not a valid JSON'));
			}
		});
		req.on('error', e => {
			reject(e);
		});
	});
}