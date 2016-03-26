var fs = require("fs");
var WebSocketServer = require("ws").Server;
var express = require("express");
var busboy = require("connect-busboy");
var config = require("./config.json");

var app = express();
app.use(busboy());

app.get("/list", function(req, res)
{
	fs.readdir(__dirname + "/../files", function(err, files)
	{
		if(err)
		{
			console.log(err);
			res.end("[]");
			return;
		}
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

var streamWidth = 960;
var streamHeight = 540; 
var wss = new WebSocketServer({port: config.wsPort});
wss.on("connection", function(socket)
{
	var streamHeader = new Buffer(8);
	streamHeader.write("jsmp");
	streamHeader.writeUInt16BE(streamWidth, 4);
	streamHeader.writeUInt16BE(streamHeight, 6);
	socket.send(streamHeader, {binary:true});
});
wss.broadcast = function(data, opts)
{
	this.clients.forEach(function(socket)
	{
		if(socket.readyState == 1)
			socket.send(data, opts);
	});
};

app.get("/jsmpeg.js", function(req, res)
{
	res.sendFile(__dirname + "/jsmpeg.js");
});
app.post("/stream/:width/:height/:secret", function(req, res)
{
	if(req.params.secret != config.secret)
	{
		res.end("invalid secret");
		return;
	}
	console.log("Stream connected");
	
	streamWidth = req.params.width;
	streamHeight = req.params.height;
	
	req.on("data", function(buff)
	{
		wss.broadcast(buff, {binary:true});
	});
});

app.use("/files", express.static(__dirname + "/../files"));
app.get("/:file", function(req, res)
{
	res.sendFile(__dirname + "/view.html");
});

app.listen(config.port, function()
{
	console.log("Started webserver on port " + config.port);
});
