# Buoy Images

This folder contains the buoy images for the AquaNet app.

## Required Images

Please add the following PNG images to this folder:

- `buoy1.png` - Image for Buoy 1
- `buoy2.png` - Image for Buoy 2  
- `buoy3.png` - Image for Buoy 3
- `buoy4.png` - Image for Buoy 4
- `buoy5.png` - Image for Buoy 5

## Image Specifications

- **Format**: PNG
- **Size**: Recommended 200x200 pixels or larger
- **Background**: Transparent or white background works best
- **Style**: Should be clear and recognizable

## How It Works

The app automatically displays the correct buoy image based on the buoy name from the API data:
- If the latest data shows "Buoy 2", it will display `buoy2.png`
- If the latest data shows "Buoy 1", it will display `buoy1.png`
- And so on...

## Fallback

If a buoy image is not found, the app will default to showing `buoy1.png`.

## Adding Images

1. Place your PNG files in this folder
2. Make sure the filenames match exactly: `buoy1.png`, `buoy2.png`, etc.
3. Restart the app to see the changes
