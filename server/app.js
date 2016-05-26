var fs = require("fs");
var WebSocketServer = require("ws").Server;
var express = require("express");
var busboy = require("connect-busboy");
var config = require("./config.json");

var app = express();
app.use(busboy());

app.get("/list", function(req, res)
{
	var basePath = __dirname + "/../files/";
	fs.readdir(basePath, function(err, files)
	{
		if(err)
		{
			console.log(err);
			res.end("[]");
			return;
		}

		var cache = {};
		files.sort(function(a, b)
		{
			cache[a] = cache[a] || fs.statSync(basePath + a).mtime.getTime();
			cache[b] = cache[b] || fs.statSync(basePath + b).mtime.getTime();
			return cache[a] - cache[b];
		});

		res.send(JSON.stringify(files));
	});
});

app.post("/upload/:secret", function(req, res)
{
	if(req.params.secret != config.secret)
	{
		res.end("invalid secret");
		return;
	}

	req.pipe(req.busboy);
	req.busboy.on("file", function (name, file, filename)
	{
		var outname = Math.random().toString(36).substr(2, 6) + filename.substr(filename.lastIndexOf("."));
		console.log((new Date()).toLocaleString() + " Uploading: " + outname);
		var stream = fs.createWriteStream(__dirname + "/../files/" + outname);
		file.pipe(stream);
		stream.on("close", function ()
		{
			res.end("http://" + req.get("host") + "/" + outname);
		});
	});
});

app.use("/files", express.static(__dirname + "/../files"));
app.get("/:file", function(req, res)
{
	res.sendFile(__dirname + "/view.html");
});

app.get("/", function(req, res)
{
	res.sendFile(__dirname + "/view.html");
});

app.listen(config.port, function()
{
	console.log("Started webserver on port " + config.port);
});
