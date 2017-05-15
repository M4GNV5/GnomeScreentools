var fs = require("fs");
var path = require("path");
var zlib = require("zlib");
var ejs = require("ejs");
var express = require("express");
var busboy = require("connect-busboy");
var config = require("./config.json");
var files = require("./data.json");

var app = express();
app.use(busboy());

var basePath = __dirname + "/../files/";

fs.readdir(basePath, function(err, foundFiles)
{
	if(err)
		throw err;

	var _files = files;
	files = {};
	for(var i = 0; i < foundFiles.length; i++)
	{
		files[foundFiles[i]] = _files[foundFiles[i]] || {author: "system"};
		files[foundFiles[i]].mtime = fs.statSync(basePath + foundFiles[i]).mtime.getTime();
	}
});

fs.watch(basePath, function(ev, file)
{
	try
	{
		var mtime = fs.statSync(basePath + file).mtime.getTime();
	}
	catch(e)
	{
		console.log(e);
		delete files[file];
		return;
	}

	files[file] = files[file] || {};

	if(typeof files[file].author == "undefined" || mtime - 10000 > files[file].mtime)
		files[file].author = "system";

	files[file].mtime = mtime;
	fs.writeFile(__dirname + "/data.json", JSON.stringify(files));
});

app.post("/upload/:secret", function(req, res)
{
	var secret = req.params.secret;
	if(!config.secrets.hasOwnProperty(secret))
	{
		res.end("invalid secret");
		return;
	}

	req.pipe(req.busboy);
	req.busboy.on("file", function (name, file, filename)
	{
		var outname = Math.random().toString(36).substr(2, 6) + filename.substr(filename.lastIndexOf("."));
		console.log((new Date()).toLocaleString() + " Uploading (uncompressed): " + outname);

		var stream = fs.createWriteStream(__dirname + "/../files/" + outname);
		file.pipe(stream);

		stream.on("close", function ()
		{
			res.end("http://" + req.get("host") + "/" + outname);

			var user = config.secrets[secret];
			files[outname] = {mtime: Date.now(), author: user};
			fs.writeFile(__dirname + "/data.json", JSON.stringify(files));
		});
	});
});

app.post("/cupload/:secret", function(req, res)
{
	var secret = req.params.secret;
	if(!config.secrets.hasOwnProperty(secret))
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
		var gzip = zlib.createGunzip();
		file.pipe(gzip).pipe(stream);

		stream.on("close", function ()
		{
			res.end("http://" + req.get("host") + "/" + outname);

			var user = config.secrets[secret];
			files[outname] = {mtime: Date.now(), author: user};
			fs.writeFile(__dirname + "/data.json", JSON.stringify(files));
		});
	});
});

app.get("/upload", function(req, res)
{
	ejs.renderFile(__dirname + "/view.ejs", {
		url: req.url,
		fileName: ".upload",
		filePath: undefined,
		file: true,
		fs: fs,
		files: files,
		tagSearch: req.query.q
	}, {}, function(err, str)
	{
		if(err)
			console.log(err);
		res.send((err || str).toString());
	});
});

app.post("/delete", function(req, res)
{
	res.end("hi" + require("util").inspect(req));
});
app.get("/delete", function(req, res)
{
	var secret = req.query.secret;
	var file = req.query.file;
	if(files.hasOwnProperty(file) && files[file].author == config.secrets[secret])
	{
		fs.unlink(__dirname + "/../files/" + file, function(err)
		{
			if(err)
				console.log(err);

			delete files[file];
			res.end("file deleted");
		});
	}
	else
	{
		ejs.renderFile(__dirname + "/view.ejs", {
			url: req.url,
			fileName: ".delete",
			filePath: undefined,
			file: true,
			fs: fs,
			files: files,
			tagSearch: req.query.q
		}, {}, function(err, str)
		{
			if(err)
				console.log(err);

			res.send((err || str).toString());
		});
	}
});

app.use("/files", express.static(__dirname + "/../files"));
app.get("/:file", function(req, res)
{
	var accept = req.get("Accept");
	if(accept && /text\/html/.test(accept))
	{
		ejs.renderFile(__dirname + "/view.ejs", {
			url: req.url,
			fileName: req.params.file,
			filePath: __dirname + "/../files/" + req.params.file,
			file: files[req.params.file],
			fs: fs,
			files: files,
			tagSearch: req.query.q
		}, {}, function(err, str)
		{
			if(err)
				console.error(err);
			res.send((err || str).toString());
		});
	}
	else
	{
		res.sendFile(path.resolve(__dirname + "/../files/" + req.params.file));
	}
});

app.get("/", function(req, res)
{
	ejs.renderFile(__dirname + "/view.ejs", {
		url: req.url,
		fileName: ".list",
		filePath: undefined,
		file: true,
		fs: fs,
		files: files,
		tagSearch: req.query.q
	}, {}, function(err, str)
	{
		if(err)
			console.log(err);
		res.send((err || str).toString());
	});
});

app.listen(config.port, function()
{
	console.log("Started webserver on port " + config.port);
});
