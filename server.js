import http from "http";

http.createServer((req, res) => {

    console.log(req.url);
    console.log(req.params);

    res.statusCode = 200;
    res.statusMessage = "Woohoo";
    res.setHeader("Content-Type", "text/plain");
    res.end("Aha");
}).listen(9000);