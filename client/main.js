var fs = require("fs");
var net = require("net");
var request = require("request");
var childp = require("child_process");
var exec = childp.exec;
var config = require("./config.json");

var job = process.argv[2] || config["default-job"] || "img-full";

config.file = config["tmpfile"] || "screencapture";
var modes = {
	"img-full": shellCmd("gnome-screenshot -f {file}", "png"),
	"img-region": shellCmd("gnome-screenshot -a -f {file}", "png"),
	"vid-full": function()
	{
		config.file += ".mp4";
		args = formatCmd("-video_size {screen-size} -framerate {vid-fps} -f x11grab -i :0.0 -vf scale={vid-scale} {file}");

		var p = childp.spawn("avconv", args.split(" "));
		p.on("close", function()
		{
			afterRecord();
		});
		server.once("connection", function()
		{
			p.kill("SIGINT");
		});
	}
};

var port = config["busy-port"] || 3112;
var server = net.createServer();
server.once("error", function(err)
{
	if(err.code === "EADDRINUSE")
	{
		var sock = net.connect(port, "localhost", function()
		{
			sock.end();
			process.exit(0);
		});
	}
});
server.once("listening", modes[job]);
server.listen(port);

function shellCmd(cmd, fileext)
{
	return function()
	{
		config.file += "." + fileext;
		cmd = formatCmd(cmd);

		exec(cmd, afterRecord);
	};
}

function formatCmd(cmd)
{
	for(var key in config)
	{
		cmd = cmd.replace("{" + key + "}", config[key]);
	}
	return cmd;
}

function afterRecord(err)
{
	if(err)
		throw err;
	upload(config.file, function(err, url)
	{
		if(err)
			throw err;

		fs.unlink(config.file);

		copypasta(url, function(err)
		{
			if(err)
				throw err;
			console.log(url);
			process.exit(0);
		});
	});
}

function upload(file, cb)
{
	var req = request.post(config["upload-url"], function (err, response, body) {
		cb(err, body);
	});
	var form = req.form();
	form.append("file", fs.createReadStream(file));
}

function copypasta(text, cb)
{
	var p = exec("echo -n " + JSON.stringify(text) + " | xclip -selection clipboard");
	p.on("exit", cb);
}
