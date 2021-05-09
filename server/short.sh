#!/bin/bash

set -e

minutes=$(echo "$DOCUMENT_URI" | grep -Eo '[0-9a-fA-F]+' | head -n1)
ext=$(echo "$DOCUMENT_URI" | cut -d '.' -f 2)
timestamp=$(((25418760 + $((16#"$minutes"))) * 60))

localname="$(date --date "@$timestamp" "+%Y-%m/%Y-%m-%dT%R")"
filename="/var/www/i.m4gnus.de/$localname.$ext"

if [ ! -f "$filename" ]; then
	printf "Content-type: text/plain\n\nInvalid file $DOCUMENT_URI ($filename)\n"
	exit 0
fi

if [ "$ext" == "txt" ]; then
	echo "Status: 303 See Other"
	echo "Location: /text.html?$localname.txt"
	echo ""
	echo ""
	exit 0
fi

mime=$(file -b --mime-type "$filename")

echo "Content-type: $mime"
echo ""
cat "$filename"
