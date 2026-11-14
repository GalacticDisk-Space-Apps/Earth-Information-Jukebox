# NASA Earth Science Data Credits & Attributions

**Project**: Earth Information Jukebox  
**Event**: NASA International Space Apps Challenge 2026  
**Challenge**: The Earth Information Jukebox  
**Data Pipeline Lead**: Avidan  

---

## 1. Primary Datasets

### Track 1: Ocean Fever (Sea Surface Temperature)
- **Dataset Title**: GHRSST Level 4 MUR Global Foundation Sea Surface Temperature Analysis (v4.1)
- **Short Name / Layer ID**: `GHRSST_L4_MUR_Sea_Surface_Temperature`
- **Data Provider**: NASA Jet Propulsion Laboratory (JPL) / Physical Oceanography DAAC (PO.DAAC)
- **GIBS Endpoint**: `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi`
- **Official Colormap**: `https://gibs.earthdata.nasa.gov/colormaps/v1.3/GHRSST_Sea_Surface_Temperature.xml`
- **Temporal Range Used**: 2004-08-01 to 2024-08-01 (Annual snapshot on August 1st)
- **Units**: Degrees Celsius (°C)
- **Spatial Resolution**: Downsampled from native 1 km to 180×90 (2° grid) for musical sonification
- **Scientific Significance**: Demonstrates multi-decadal ocean warming trends, marine heatwave patterns, and equatorial thermal shifts.

### Track 2: Breathing Planet (Vegetation Canopy Index)
- **Dataset Title**: MODIS/Terra Vegetation Indices 16-Day / Monthly L3 Global 0.05 Deg CMG (MOD13C2)
- **Short Name / Layer ID**: `MODIS_Terra_L3_NDVI_Monthly`
- **Data Provider**: NASA Land Processes Distributed Active Archive Center (LP DAAC)
- **GIBS Endpoint**: `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi`
- **Official Colormap**: `https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_L3_NDVI.xml`
- **Temporal Range Used**: 2004-08-01 to 2024-08-01 (Annual snapshot on August 1st)
- **Units**: Normalized Difference Vegetation Index (NDVI, dimensionless: -0.2 to 1.0)
- **Spatial Resolution**: Downsampled to 180×90 (2° grid)
- **Scientific Significance**: Captures hemispheric vegetation canopy density, agricultural greenness, deforestation, and boreal forest dynamics.

### Track 3: Melting Crown (Polar Sea Ice Concentration)
- **Dataset Title**: GHRSST Level 4 MUR Sea Ice Concentration Analysis / NSIDC
- **Short Name / Layer ID**: `GHRSST_L4_MUR_Sea_Ice_Concentration`
- **Data Provider**: NASA JPL / PO.DAAC & National Snow and Ice Data Center (NSIDC)
- **GIBS Endpoint**: `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi`
- **Official Colormap**: `https://gibs.earthdata.nasa.gov/colormaps/v1.3/GHRSST_Sea_Ice_Concentration.xml`
- **Temporal Range Used**: 2004-08-01 to 2024-08-01 (Annual snapshot on August 1st)
- **Units**: Percentage coverage (%)
- **Spatial Resolution**: Downsampled to 180×90 (2° grid)
- **Scientific Significance**: Documents Arctic and Antarctic sea ice retreat, summer melt minimums, and polar cryosphere decline.

---

## 2. Infrastructure & Services
- **NASA Global Imagery Browse Services (GIBS)**: Enables full-resolution imagery queries via OGC Web Map Service (WMS) and Web Map Tile Service (WMTS).
- **NASA Earthdata**: `https://earthdata.nasa.gov`
- **NASA Worldview**: Visual exploration and layer verification tool (`https://worldview.earthdata.nasa.gov`).
- **NASA Visible Earth**: NASA Blue Marble & Black Marble imagery for 3D globe basemaps.

---

## 3. Transformation & Validity Methodology
Unlike conventional creative visual sonifications that map arbitrary pixel brightness or raw screen colors to audio, **Earth Information Jukebox** uses the official NASA GIBS XML Colormap definitions to perform nearest-color Euclidean distance matching in RGB space. 

This converts every pixel back to its calibrated, scientifically validated numerical value (°C, NDVI, % concentration) before passing the matrix to the Tone.js sonification engine. Transparent pixels and non-applicable land/ocean masks are accurately mapped to `null` to produce informative silence.
