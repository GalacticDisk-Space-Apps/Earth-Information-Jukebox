#!/usr/bin/env python3
"""
fetch_gibs.py - NASA GIBS WMS Downloader for Earth Information Jukebox

Downloads global equirectangular (EPSG:4326, 2:1, 1440x720) satellite imagery
from NASA GIBS WMS GetMap service. Saves to public/data/<track-id>/<date>.png.
"""

import os
import sys
import time
import argparse
from pathlib import Path
import requests
import yaml

GIBS_WMS_URL = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
USER_AGENT = "EarthInformationJukebox/1.0 (NASA Space Apps Challenge 2026; contact: avidan)"

def get_session():
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    return session

def download_frame(session: requests.Session, layer: str, date_str: str, out_path: Path, max_retries: int = 4) -> bool:
    if out_path.exists() and out_path.stat().st_size > 5000:
        print(f"  [SKIP] {out_path.name} already exists ({out_path.stat().st_size // 1024} KB)")
        return True

    params = {
        "SERVICE": "WMS",
        "REQUEST": "GetMap",
        "VERSION": "1.1.1",
        "LAYERS": layer,
        "STYLES": "",
        "FORMAT": "image/png",
        "TRANSPARENT": "true",
        "HEIGHT": 720,
        "WIDTH": 1440,
        "TIME": date_str,
        "SRS": "EPSG:4326",
        "BBOX": "-180,-90,180,90"
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = out_path.with_suffix(".tmp.png")

    for attempt in range(1, max_retries + 1):
        try:
            resp = session.get(GIBS_WMS_URL, params=params, timeout=30, stream=True)
            if resp.status_code == 200:
                content_type = resp.headers.get("Content-Type", "")
                if "image" not in content_type and "png" not in content_type:
                    # Might be an XML ServiceException
                    err_text = resp.text[:200]
                    print(f"  [WARN] Non-image response for {date_str} (attempt {attempt}/{max_retries}): {err_text}")
                    time.sleep(2 * attempt)
                    continue

                with open(temp_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=65536):
                        if chunk:
                            f.write(chunk)

                if temp_path.stat().st_size > 1000:
                    temp_path.replace(out_path)
                    print(f"  [OK] Downloaded {out_path.name} ({out_path.stat().st_size // 1024} KB)")
                    return True
                else:
                    print(f"  [WARN] Downloaded file too small ({temp_path.stat().st_size} bytes)")
            else:
                print(f"  [FAIL] HTTP {resp.status_code} on attempt {attempt}/{max_retries}")
        except Exception as e:
            print(f"  [ERR] Network error on attempt {attempt}/{max_retries}: {e}")

        if temp_path.exists():
            temp_path.unlink()
        time.sleep(1.5 * attempt)

    print(f"  [ERROR] Failed to download {layer} for {date_str} after {max_retries} attempts")
    return False

def main():
    parser = argparse.ArgumentParser(description="Fetch NASA GIBS imagery frames.")
    parser.add_argument("--config", default="scripts/tracks.yaml", help="Path to tracks.yaml")
    parser.add_argument("--track", help="Filter by specific track id (e.g. ocean-fever)")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of frames per track")
    parser.add_argument("--overwrite", action="store_true", help="Force re-download existing files")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    config_path = (project_root / args.config).resolve()

    if not config_path.exists():
        print(f"Configuration file not found: {config_path}")
        sys.exit(1)

    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    tracks = config.get("tracks", [])
    if args.track:
        tracks = [t for t in tracks if t.get("id") == args.track]
        if not tracks:
            print(f"No track with id '{args.track}' found in {config_path}")
            sys.exit(1)

    session = get_session()
    print(f"Starting GIBS download for {len(tracks)} track(s)...")

    for t in tracks:
        track_id = t["id"]
        layer = t["gibs_layer"]
        dates = t.get("dates", [])
        if args.limit:
            dates = dates[:args.limit]

        out_dir = project_root / "public" / "data" / track_id
        out_dir.mkdir(parents=True, exist_ok=True)

        print(f"\n========================================================")
        print(f"Track: {t['title']} ({track_id})")
        print(f"Layer: {layer} | Frames: {len(dates)}")
        print(f"Destination: {out_dir}")
        print(f"========================================================")

        success_count = 0
        for i, d in enumerate(dates, 1):
            out_file = out_dir / f"{d}.png"
            if args.overwrite and out_file.exists():
                out_file.unlink()

            print(f"[{i}/{len(dates)}] Frame {d} ->", end=" ")
            if download_frame(session, layer, d, out_file):
                success_count += 1
            # Polite interval between requests
            time.sleep(0.2)

        print(f"Finished {track_id}: {success_count}/{len(dates)} frames ready.")

if __name__ == "__main__":
    main()
