var fs = require("fs");
var ejs = require("ejs");
var express = require("express");
var busboy = require("connect-busboy");
var config = require("./config.json");
var files = require("./data.json");
var dataHasChanges = true;

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
		files[foundFiles[i]] = _files[foundFiles[i]] || {author: "system", tags: ""};
		files[foundFiles[i]].mtime = fs.statSync(basePath + foundFiles[i]).mtime.getTime();
	}

	function updateData()
	{
		if(dataHasChanges)
			fs.writeFile(__dirname + "/data.json", JSON.stringify(files));
		dataHasChanges = false;
	}

	updateData();
	setInterval(updateData, 60 * 60 * 1000);
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
	dataHasChanges = true;
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
		console.log((new Date()).toLocaleString() + " Uploading: " + outname);

		var stream = fs.createWriteStream(__dirname + "/../files/" + outname);
		file.pipe(stream);

		stream.on("close", function ()
		{
			res.end("http://" + req.get("host") + "/" + outname);

			var user = config.secrets[secret];
			files[outname] = {mtime: Date.now(), author: user};
			dataHasChanges = true;
		});
	});
});

app.get("/tag/:tags/:file", function(req, res)
{
	if(files.hasOwnProperty(req.params.file))
	{
		files[req.params.file].tags = req.params.tags;
		dataHasChanges = true;
	}
	res.redirect("/" + req.params.file);
});

app.use("/files", express.static(__dirname + "/../files"));
app.get("/:file", function(req, res)
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
			console.log(err);
		res.send((err || str).toString());
	});
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
