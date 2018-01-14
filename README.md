# GnomeScreentools
script for capturing and uploading videos, images and text

## Install
```bash
#install required packages
apt-get install libnotify-bin scrot ffmpeg imagemagick xclip

git clone https://github.com/M4GNV5/GnomeScreentools.git
cd GnomeScreentools
#customize your config in client/main.sh

client/main.sh <mode> #See modes below
#you might want to register a hotkey for this
#under gnome goto settings > keyboard > shortcuts > custom
#when recording videos via hotkeys press the hotkey again to stop the recording
```

## Modes
- `img-full` capture fullscreenimage downscale (according to config)
- `img-region` select a region and capture image
- `clipboard` upload the contents of the clipboard as text
- `cli` upload a file specified as an extra commandline argument
- `vid-full` record a fullscreen video (scaling according to the config)
- `vid-window` record a video after selecting a window
