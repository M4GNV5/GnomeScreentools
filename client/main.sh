#!/bin/bash

file="$HOME/screencapture"
declare -A config=(
	["screen-size"]="1920x1080"

	["img-full-resize"]="50%"

	["vid-scale"]="1920/2:-1"
	["vid-fps"]="30"
	["upload-url"]="http://127.0.0.1:8080/upload/hunter2"

	["busy-port"]=3112
)

function img-full
{
	file+=".png"
	gnome-screenshot -f $file
	convert $file -resize ${config["img-full-resize"]} $file
}

function img-region
{
	file+=".png"
	gnome-screenshot -a -f "$file"
}

function clipboard
{
	file+=".txt"
	xclip -selection clipboard -o > "$file"
}

function cli
{
	file+=".${cliFile##*.}"
	cp $cliFile $file
}

function vid-full
{
	file+=".mp4"
	avconv -video_size ${config["screen-size"]} -framerate ${config["vid-fps"]} \
		-f x11grab -i :0.0 -vf scale=${config["vid-scale"]} "$file" &
	local avconvPid=$!
	nc -lp ${config["busy-port"]}
	kill -SIGINT $avconvPid
	wait $avconvPid
}

echo "" | nc -q 1 localhost ${config["busy-port"]}
if [ $? -eq 0 ]; then
	exit 0
fi

cliFile=$2
$1

if [ ! -e "$file" ]; then
	exit 1
fi

notify-send -i camera-web "Uploading..."
url=$(curl -F "file=@$file" ${config["upload-url"]})
echo -n "$url" | xclip -selection clipboard
notify-send -i camera-web "$url"
rm $file
