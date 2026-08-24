import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scratch/color_powder_p1_raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

spans = data['spans']
lines = data['lines']

# Check header spans (y < 200)
header_spans = [s for s in spans if s['bbox'][1] < 200]
print(f"Header spans ({len(header_spans)}):")
for s in sorted(header_spans, key=lambda s: (s['bbox'][1], s['bbox'][0])):
    print(f"  {s['bbox']}: {repr(s['text'])}")

# Check all unique horizontal lines (y values)
h_y = []
for l in lines:
    if l['type'] == 'l':
        x1, y1 = l['p1']
        x2, y2 = l['p2']
        if abs(y1 - y2) < 2.0:
            h_y.append((y1+y2)/2)
    elif l['type'] == 're':
        r = l['rect']
        h_y.append(r[1])
        h_y.append(r[3])

h_y = sorted(list(set([round(y, 1) for y in h_y if y > 100])))
print(f"\nHorizontal line Y coords ({len(h_y)}):")
print(h_y)
