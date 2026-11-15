# NASA Visible Earth Texture Reference

This document lists the expected texture assets for the 3D interactive globe (`src/globe/Globe.tsx`) and instructions on where to acquire them from NASA Visible Earth.

## Expected Files in `public/textures/`

All textures must use an **equirectangular (plate carrée)** 2:1 aspect ratio projection covering latitude 90°N to 90°S and longitude 180°W to 180°E.

| File Path | Description | Recommended Dimensions | Source URL |
| --- | --- | --- | --- |
| `public/textures/earth_day.jpg` | NASA Blue Marble Next Generation (land, shallow water bathymetry, topography) | 2048x1024 or 4096x2048 JPG | [NASA Visible Earth: Blue Marble](https://visibleearth.nasa.gov/collection/1484/blue-marble) |
| `public/textures/earth_night.jpg` | NASA Earth at Night / Black Marble (global city lights and nighttime luminosity) | 2048x1024 JPG | [NASA Visible Earth: Earth at Night](https://visibleearth.nasa.gov/view.php?id=55167) |
| `public/textures/earth_clouds.jpg` | Global cloud fraction and atmospheric moisture composite | 2048x1024 or 4096x2048 JPG | [NASA Visible Earth: Clouds](https://visibleearth.nasa.gov/view.php?id=57747) |
| `public/textures/earth_topography.jpg` | Global topography and bathymetry surface elevation relief | 2048x1024 JPG | [NASA Visible Earth: Topography](https://visibleearth.nasa.gov/view.php?id=73934) |

## Download & Placement Instructions

1. Download the equirectangular image from the official NASA Visible Earth links above.
2. For optimal web rendering speed and memory usage, resize the image to `2048x1024` or `4096x2048` pixels in JPEG format (85% quality).
3. Place the file at:
   ```
   public/textures/earth_day.jpg
   ```

## Fallback Behavior

If `public/textures/earth_day.jpg` is absent, `Globe.tsx` catches the missing file and automatically falls back to an internal procedural canvas texture. This fallback renders a deep ocean blue sphere (`#0B1D3A`) overlaid with standard latitude and longitude grid lines at 15-degree increments, with prominent markings for the Equator and Prime Meridian.
