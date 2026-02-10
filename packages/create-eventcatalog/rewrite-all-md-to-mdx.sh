#!/bin/bash

echo "Searching for .md files to rename to .mdx..."

# Find all .md files recursively and process them
find . -type f -name "*.md" | while read -r file; do
    if [ -f "$file" ]; then
        newfile="${file%.md}.mdx"
        echo "Renaming: $file -> $newfile"
        mv "$file" "$newfile"
    fi
done

# Check if any files were processed
if [ -z "$(find . -type f -name "*.md")" ]; then
    echo "No .md files found to process."
fi

echo "Done!"

