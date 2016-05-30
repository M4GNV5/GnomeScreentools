var fs = require("fs");
var WebSocketServer = require("ws").Server;
var express = require("express");
var busboy = require("connect-busboy");
var config = require("./config.json");
var files = require("./data.json");

var app = express();
app.use(busboy());

var basePath = __dirname + "/../files/";

function deleteOldFiles()
{
	var delTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
	for(var key in files)
	{
		if(config.keepFiles.indexOf(key) !== -1)
			continue;

		if(files[key].mtime < delTime)
		{
			console.log("Deleting old file " + key);
			fs.unlink(basePath + key);
			delete files[key];
		}
	}
}

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

	deleteOldFiles();
	setInterval(deleteOldFiles, 60 * 60 * 1000);
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
});

app.get("/list", function(req, res)
{
	res.send(JSON.stringify(files));
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
			fs.writeFile("./data.json", JSON.stringify(files, null, 4));
		});
	});
});

var viewFile = fs.readFileSync(__dirname + "/view.html").toString();
app.use("/files", express.static(__dirname + "/../files"));
app.get("/:file", function(req, res)
{
	var file = files[req.params.file];
	var fileInfo = "";
	if(file)
	{
		var timediff = (Date.now() - file.mtime) / 1000;
		if(timediff < 60)
			fileInfo = parseInt(timediff) + " seconds ago";
		else if(timediff < 60 * 60)
			fileInfo = parseInt(timediff / 60) + " minutes ago";
		else if(timediff < 60 * 60 * 24)
			fileInfo = parseInt(timediff / 60 / 60) + " hours ago";
		else
			fileInfo = parseInt(timediff / 60 / 60 / 24) + " days ago";
		fileInfo += " by " + file.author;
	}

	res.send(viewFile.replace(/%FILEINFO%/g, fileInfo));
});

app.get("/", function(req, res)
{
	res.send(viewFile.replace(/%FILEINFO%/g, ""));
});

app.listen(config.port, function()
{
	console.log("Started webserver on port " + config.port);
});
