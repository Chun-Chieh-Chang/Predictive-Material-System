import json
import sys
import io
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

with open('scratch/color_powder_p1_raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

spans = data['spans']
links = data['links']
lines = data['lines']

print(f"Total spans: {len(spans)}")
print(f"Total links: {len(links)}")
print(f"Total lines/rects: {len(lines)}")

# Find vertical grid lines around y=150 (table header / data area)
v_lines = []
for l in lines:
    if l['type'] == 'l':
        x1, y1 = l['p1']
        x2, y2 = l['p2']
        if abs(x1 - x2) < 2.0 and min(y1, y2) <= 150 <= max(y1, y2):
            v_lines.append((x1+x2)/2)
    elif l['type'] == 're':
        x0, y0, x1, y1 = l['rect']
        if y0 <= 150 <= y1:
            v_lines.append(x0)
            v_lines.append(x1)

v_lines = sorted(list(set([round(x, 1) for x in v_lines])))
print(f"\nDistinct Vertical Lines X ({len(v_lines)}):")
print(v_lines)

# Find horizontal grid lines
h_lines = []
for l in lines:
    if l['type'] == 'l':
        x1, y1 = l['p1']
        x2, y2 = l['p2']
        if abs(y1 - y2) < 2.0 and min(x1, x2) <= 100 and max(x1, x2) >= 2000 and y1 >= 100:
            h_lines.append((y1+y2)/2)
    elif l['type'] == 're':
        x0, y0, x1, y1 = l['rect']
        if x0 <= 100 and x1 >= 2000 and y0 >= 100:
            h_lines.append(y0)
            h_lines.append(y1)

h_lines = sorted(list(set([round(y, 1) for y in h_lines])))
print(f"\nDistinct Horizontal Lines Y ({len(h_lines)}):")
print(h_lines)
