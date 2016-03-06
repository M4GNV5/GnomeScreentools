var fs = require("fs");
var express = require("express");
var busboy = require("connect-busboy");
var config = require("./config.json");

var app = express();
app.use(busboy());

app.get("/", function(req, res)
{
	res.sendFile(__dirname + "/index.html");
});

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
		console.log("Uploading: " + filename);
		var outname = Math.random().toString(36).substr(2, 6) + filename.substr(filename.lastIndexOf("."));
		var stream = fs.createWriteStream(__dirname + "/../files/" + outname);
		file.pipe(stream);
		stream.on("close", function ()
		{
			console.log("done upload");
			res.end(req.get("host") + "/i/" + outname);
		});
	});
});

app.use("/i", express.static(__dirname + "/../files"));

app.listen(config.port, function()
{
	console.log("Started webserver on port " + config.port);
});
