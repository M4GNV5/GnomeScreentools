#!/bin/bash

file="$HOME/screencapture"
basedir=$(dirname "$0")
declare -A config=(
	["screen-size"]="1920x1080"

	#["img-full-resize"]="50%"

	["vid-scale"]="1920/2:-1"
	["vid-fps"]="30"

	#put your microphone here
	["microphone"]=""

	["remote-host"]="jakob"
	["remote-path"]="/var/www/i.m4gnus.de/"
	["copy-url"]="https://i.m4gnus.de/"

	["busy-port"]=3112
)

function img-full
{
	file+=".png"
	scrot "$file"
}

function img-region-old
{
	local tmpfile="${file}_tmp.png"
	file+=".png"

	scrot "$tmpfile"

	eog -f "$tmpfile" &
	local eogPid=$!

	gnome-screenshot -a -f "$file"
	kill -TERM $eogPid

	rm "$tmpfile"
}

function img-region
{
	file+=".png"
	flameshot gui -p /tmp -r > "$file"

	if [ $? -ne 0 ]; then
		rm "$file"
	fi
}

function clipboard
{
	file+=".txt"
	xclip -selection clipboard -o > "$file"
}

function cli
{
	file+=".${cliFile##*.}"
	cp "$cliFile" "$file"
}

function vid-full
{
	file+=".mp4"
	ffmpeg -video_size ${config["screen-size"]} -framerate ${config["vid-fps"]} \
		-f x11grab -i :0.0 -vf scale=${config["vid-scale"]} "$file" &
	local ffmpegPid=$!
	nc -lp ${config["busy-port"]}
	kill -SIGINT $ffmpegPid
	wait $ffmpegPid
}

function vid-window
{
	out=$(xwininfo)

	startX=$(echo $out | grep -Po "Absolute upper-left X:\s*(\d+)" | cut -d: -f2 | tr -d '[:space:]')
	startY=$(echo $out | grep -Po "Absolute upper-left Y:\s*(\d+)" | cut -d: -f2 | tr -d '[:space:]')
	width=$(echo $out | grep -Po "Width:\s*(\d+)" | cut -d: -f2 | tr -d '[:space:]')
	height=$(echo $out | grep -Po "Height:\s*(\d+)" | cut -d: -f2 | tr -d '[:space:]')

	rem=$(($width % 2))
	if [[ $rem -eq 1 ]]; then
		width=$(($width + 1))
	fi

	rem=$(($height % 2))
	if [[ $rem -eq 1 ]]; then
		height=$(($height + 1))
	fi

	file+=".mp4"
	ffmpeg -video_size "${width}x${height}" -framerate ${config["vid-fps"]} \
		-f x11grab -i :1.0+$startX,$startY "$file" &
	local ffmpegPid=$!
	nc -lp ${config["busy-port"]}
	kill -SIGINT $ffmpegPid
	wait $ffmpegPid
}

function vid-full-audio
{
	file+=".mp4"
	ffmpeg -f pulse -ac 1 -i "${config["microphone"]}" \
		-f x11grab -r ${config["vid-fps"]} -s ${config["screen-size"]} -i :1.0+0,0 \
		-acodec aac -vcodec libx264 -vf scale=${config["vid-scale"]} "$file" &
	local ffmpegPid=$!
	nc -lp ${config["busy-port"]}
	kill -SIGINT $ffmpegPid
	wait $ffmpegPid
}

echo "" | nc -q 1 localhost ${config["busy-port"]}
if [ $? -eq 0 ]; then
	exit 0
fi

cliFile=$2
$1

if [ ! -e "$file" ]; then
	notify-send "Error creating screenshot!"
	exit 1
fi

target="$(date +"%Y-%m/%Y-%m-%dT%R").${file##*.}"
short=$(printf "%x\n" $(($(date "+%s") / 60 - 25418760)))
remotePath="${config["remote-host"]}:${config["remote-path"]}"
scp "$file" "$remotePath$target"
if [ $? -ne 0 ]; then
	ssh "${config["remote-host"]}" "mkdir -p ${config["remote-path"]}/$(date +"%Y-%m")"
	scp "$file" "$remotePath$target"
fi

if [ $? -ne 0 ]; then
	notify-send "Error uploading screenshot!"
	exit 1
fi

url="${config["copy-url"]}$short.${file##*.}"
echo -n "$url" | xclip -selection clipboard

notify-send -i camera-web "$url"
rm $file
