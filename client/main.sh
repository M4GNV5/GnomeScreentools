#!/bin/bash

file="$HOME/screencapture"
basedir=$(dirname "$0")
declare -A config=(
	["screen-size"]="3840x2160"

	#["img-full-resize"]="50%"

	["vid-scale"]="3840/2:-1"
	["vid-fps"]="30"
	#alsa_input.usb-NA_Wireless_Audio-00.analog-mono
	["microphone"]="alsa_output.usb-NA_Wireless_Audio-00.iec958-stereo.monitor"

	["upload-url"]="http://127.0.0.1:8080/upload/hunter2"

	["busy-port"]=3112
)

function img-full
{
	file+=".png"
	scrot $file
}

function img-region
{
	file+=".png"
	scrot $file
	python "$basedir/select.py" $file $file
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
	ffmpeg -video_size ${config["screen-size"]} -framerate ${config["vid-fps"]} \
		-f x11grab -i :1.0 -vf scale=${config["vid-scale"]} "$file" &
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
	exit 1
fi

url=$(curl -F "file=@$file" ${config["upload-url"]})

echo -n "$url" | xclip -selection clipboard
notify-send -i camera-web "$url"
rm $file
