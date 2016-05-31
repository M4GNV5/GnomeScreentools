# GnomeScreentools
script + server for capturing, uploading and displaying videos, images and text

##Install
```bash
#install nodejs see https://nodejs.org/en/download/package-manager

#install required packages
apt-get install libnotify-bin gnome-screenshot libav-tools imagemagick xclip

git clone https://github.com/M4GNV5/GnomeScreentools.git
cd GnomeScreentools
npm install
#customize your client/config.json

node client/main.js <mode>
#you might want to register a hotkey for this
#under gnome goto settings > keyboard > shortcuts > custom
#when recording videos via hotkeys press the hotkey again to stop the recording
```

##Modes
- `img-full` capture fullscreenimage downscale (according to config)
- `img-region` select a region and capture image
- `clipboard` upload the contents of the clipboard as text
- `cli` upload a file specified as an extra commandline argument
- `vid-full` record a fullscreen video (scaling according to the config)
- `vid-window` click a window to record