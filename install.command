#!/bin/bash
cd "$(dirname "$0")"
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/stringglue"
echo "Installing String Glue to: $DEST"
for v in 9 10 11 12 13 14; do defaults write com.adobe.CSXS.$v PlayerDebugMode 1; done
rm -rf "$DEST"
mkdir -p "$(dirname "$DEST")"
cp -R stringglue "$DEST" || { echo "ERROR: copy failed"; exit 1; }
echo
echo "Done. Restart Illustrator and open: Window > Extensions > String Glue"
