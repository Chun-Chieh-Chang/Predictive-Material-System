import json
import sys
import io
import urllib.parse

sys.stdout.reconfigure(encoding='utf-8')

with open('scratch/color_powder_p1_raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

links = data['links']
spans = data['spans']

print(f"Total links: {len(links)}")
for lk in links[:20]:
    # find overlapping text
    bbox = lk['bbox']
    overlap = [s['text'] for s in spans if not (s['bbox'][2] < bbox[0] or s['bbox'][0] > bbox[2] or s['bbox'][3] < bbox[1] or s['bbox'][1] > bbox[3])]
    print(f"BBox: {bbox} | Text: {' '.join(overlap):<30} | URI: {lk['uri']}")
