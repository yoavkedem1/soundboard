#!/bin/bash
# Create placeholder icons for the PWA manifest

echo "Creating placeholder PWA icons..."

# Function to create a simple colored square icon with text
create_icon() {
  size=$1
  output_file=$2
  text=$3
  is_maskable=$4

  # Calculate text size and padding based on icon size
  text_size=$((size / 6))
  padding=$((size / 10))
  
  # If maskable, reduce the visible area to account for safe zone
  if [ "$is_maskable" = true ]; then
    visible_size=$((size * 8 / 10))
    offset=$((size - visible_size) / 2))
  else
    visible_size=$size
    offset=0
  fi

  # Create the icon - a brown square with text
  convert -size ${size}x${size} \
    -background "#8b5a2b" \
    -gravity center \
    -fill white \
    -pointsize $text_size \
    -draw "text 0,0 '$text'" \
    $output_file

  echo "Created $output_file"
}

# Create icons in different sizes
create_icon 192 "icon-192.png" "192px" false
create_icon 512 "icon-512.png" "512px" false
create_icon 192 "icon-192-maskable.png" "192px" true

echo "Icons created successfully!" 