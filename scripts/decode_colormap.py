#!/usr/bin/env python3
"""
decode_colormap.py - Scientific Colormap Decoder for Earth Information Jukebox

Downloads NASA GIBS colormap XMLs, builds color-to-physical-value lookup tables,
downsamples frames to 180x90 grids, maps pixels to real scientific numbers,
and generates:
  - public/data/<track-id>/values/<date>.json
  - public/data/<track-id>/meta.json
  - public/data/<track-id>/trend.json
"""

import os
import sys
import json
import argparse
from pathlib import Path
import xml.etree.ElementTree as ET
import requests
import yaml
from PIL import Image

def fetch_colormap(url: str, cache_path: Path) -> ET.Element:
    if cache_path.exists() and cache_path.stat().st_size > 500:
        with open(cache_path, "r", encoding="utf-8") as f:
            return ET.fromstring(f.read())

    print(f"  Downloading colormap XML from {url}...")
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    with open(cache_path, "w", encoding="utf-8") as f:
        f.write(resp.text)

    return ET.fromstring(resp.text)

def parse_interval(val_str: str):
    if not val_str:
        return None
    cleaned = val_str.strip("[]()")
    parts = cleaned.split(",")
    if len(parts) == 2:
        low, high = parts
        try:
            if low == "-INF":
                return float(high) - 0.1
            if high == "+INF":
                return float(low) + 0.1
            return (float(low) + float(high)) / 2.0
        except ValueError:
            return None
    elif len(parts) == 1:
        try:
            return float(parts[0])
        except ValueError:
            return None
    return None

def build_colormap_table(root: ET.Element):
    entries = []
    for entry in root.findall(".//ColorMapEntry"):
        rgb_str = entry.attrib.get("rgb")
        if not rgb_str:
            continue
        try:
            r, g, b = [int(x.strip()) for x in rgb_str.split(",")]
        except ValueError:
            continue

        is_nodata = (
            entry.attrib.get("nodata") == "true" or
            entry.attrib.get("transparent") == "true" or
            entry.attrib.get("tooltip", "").lower() == "no data"
        )

        val_str = entry.attrib.get("value") or entry.attrib.get("sourceValue") or ""
        val = parse_interval(val_str)

        entries.append({
            "rgb": (r, g, b),
            "val": val,
            "nodata": is_nodata
        })

    return entries

def decode_image_to_grid(img_path: Path, colormap_entries: list, grid_w: int = 180, grid_h: int = 90):
    with Image.open(img_path) as img:
        img = img.convert("RGBA")
        small = img.resize((grid_w, grid_h), Image.Resampling.BILINEAR)

    # Color memoization for fast nearest-neighbor matching
    color_cache = {}

    def match_pixel(r, g, b, a):
        if a < 32:
            return None
        key = (r, g, b)
        if key in color_cache:
            return color_cache[key]

        best_dist = float("inf")
        best_val = None
        for item in colormap_entries:
            cr, cg, cb = item["rgb"]
            d = (r - cr)**2 + (g - cg)**2 + (b - cb)**2
            if d < best_dist:
                best_dist = d
                best_val = None if item["nodata"] else item["val"]
                if d == 0:
                    break

        # If too far from any valid color, treat as no-data
        if best_dist > 5000:
            best_val = None

        color_cache[key] = best_val
        return best_val

    pixels = list(small.getdata())
    values = []
    for r, g, b, a in pixels:
        v = match_pixel(r, g, b, a)
        values.append(round(v, 2) if v is not None else None)

    return values

def main():
    parser = argparse.ArgumentParser(description="Decode NASA GIBS satellite frames to scientific value grids.")
    parser.add_argument("--config", default="scripts/tracks.yaml", help="Path to tracks.yaml")
    parser.add_argument("--track", help="Filter by track id (e.g. ocean-fever)")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    config_path = (project_root / args.config).resolve()

    if not config_path.exists():
        print(f"Config not found: {config_path}")
        sys.exit(1)

    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    tracks = config.get("tracks", [])
    if args.track:
        tracks = [t for t in tracks if t.get("id") == args.track]

    for t in tracks:
        track_id = t["id"]
        title = t["title"]
        colormap_url = t["colormap_url"]
        dates = t.get("dates", [])

        print(f"\n========================================================")
        print(f"Decoding Track: {title} ({track_id})")
        print(f"========================================================")

        cache_dir = project_root / "scripts" / "cache"
        cm_xml_path = cache_dir / f"{track_id}_colormap.xml"
        cm_root = fetch_colormap(colormap_url, cm_xml_path)
        colormap_entries = build_colormap_table(cm_root)
        print(f"  Parsed {len(colormap_entries)} colormap entries from {cm_xml_path.name}")

        track_data_dir = project_root / "public" / "data" / track_id
        values_dir = track_data_dir / "values"
        values_dir.mkdir(parents=True, exist_ok=True)

        trend_data = []
        valid_frames = []

        for d in dates:
            png_path = track_data_dir / f"{d}.png"
            if not png_path.exists():
                print(f"  [WARN] Frame {d}.png missing, skipping decode")
                continue

            grid_vals = decode_image_to_grid(png_path, colormap_entries, grid_w=180, grid_h=90)
            val_file = values_dir / f"{d}.json"
            grid_obj = {
                "w": 180,
                "h": 90,
                "values": grid_vals
            }
            with open(val_file, "w", encoding="utf-8") as vf:
                json.dump(grid_obj, vf, separators=(",", ":"))

            valid_pts = [v for v in grid_vals if v is not None]
            if valid_pts:
                mean_val = round(sum(valid_pts) / len(valid_pts), 2)
                min_val = round(min(valid_pts), 2)
                max_val = round(max(valid_pts), 2)
            else:
                mean_val, min_val, max_val = None, None, None

            year_str = d.split("-")[0]
            trend_data.append({
                "date": d,
                "year": year_str,
                "mean": mean_val,
                "min": min_val,
                "max": max_val,
                "sampleCount": len(valid_pts)
            })
            valid_frames.append(d)

            print(f"  [OK] Decoded {d}: samples={len(valid_pts):<5} mean={mean_val} {t['unit']} (min={min_val}, max={max_val})")

        # Save trend.json
        trend_path = track_data_dir / "trend.json"
        with open(trend_path, "w", encoding="utf-8") as tf:
            json.dump(trend_data, tf, indent=2)
        print(f"  Saved annual trend to {trend_path.name}")

        # Save meta.json
        meta_obj = {
            "id": t["id"],
            "title": t["title"],
            "dataset": t["dataset"],
            "source": t["source"],
            "unit": t["unit"],
            "min": t["min"],
            "max": t["max"],
            "frames": valid_frames,
            "instrument": t["instrument"],
            "story": t["story"]
        }
        meta_path = track_data_dir / "meta.json"
        with open(meta_path, "w", encoding="utf-8") as mf:
            json.dump(meta_obj, mf, indent=2)
        print(f"  Saved metadata to {meta_path.name}")

        # Display trend summary
        print(f"\n--- {title} Trend Summary ---")
        for item in trend_data:
            bars = ""
            if item["mean"] is not None:
                # Scaled mini ascii bar
                bar_len = int(max(0, min(30, (item["mean"] - t["min"]) / (t["max"] - t["min"]) * 30)))
                bars = "█" * bar_len
            print(f"  {item['year']}: {item['mean']:>6} {t['unit']} | {bars}")

if __name__ == "__main__":
    main()
