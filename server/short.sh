#!/bin/bash

set -e

minutes=$(echo "$DOCUMENT_URI" | grep -Eo '[0-9]+')
ext=$(echo "$DOCUMENT_URI" | cut -d '.' -f 2)
timestamp=$(((25418760 + $((16#"$minutes"))) * 60))
filename="/var/www/images/$(date --date "@$timestamp" "+%Y-%m/%Y-%m-%dT%R").$ext"

if [ ! -f "$filename" ]; then
        printf "Content-type: text/plain\n\nInvalid file $DOCUMENT_URI\n"
        exit 0
fi

mime=$(file -b --mime-type "$filename")

echo "Content-type: $mime"
echo ""
cat "$filename"
