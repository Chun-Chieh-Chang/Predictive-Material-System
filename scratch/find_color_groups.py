import json
import sys
import io

sys.stdout.reconfigure(encoding='utf-8')

with open('scratch/color_powder_p1_raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

spans = data['spans']
links = data['links']
lines = data['lines']

# Find horizontal lines in Column 0 (x between 90 and 151.4)
col0_h_lines = []
for l in lines:
    if l['type'] == 'l':
        x1, y1 = l['p1']
        x2, y2 = l['p2']
        if abs(y1 - y2) < 2.0 and min(x1, x2) <= 100 and max(x1, x2) >= 140 and y1 >= 180:
            col0_h_lines.append((y1+y2)/2)
    elif l['type'] == 're':
        x0, y0, x1, y1 = l['rect']
        if x0 <= 100 and x1 >= 140 and y0 >= 180:
            col0_h_lines.append(y0)
            col0_h_lines.append(y1)

col0_h_lines = sorted(list(set([round(y, 1) for y in col0_h_lines])))
merged_col0_y = []
for y in col0_h_lines:
    if not merged_col0_y or y - merged_col0_y[-1] > 3.0:
        merged_col0_y.append(y)

print(f"Col 0 (色粉料號) group boundaries ({len(merged_col0_y)} lines -> {len(merged_col0_y)-1} groups):")
for i in range(len(merged_col0_y)-1):
    yt, yb = merged_col0_y[i], merged_col0_y[i+1]
    group_texts = [s['text'] for s in spans if 90.0 <= (s['bbox'][0]+s['bbox'][2])/2 <= 151.4 and yt - 2.0 <= (s['bbox'][1]+s['bbox'][3])/2 <= yb + 2.0 and s['bbox'][1] >= 180]
    print(f"  Group {i:2d} (y={yt:.1f}..{yb:.1f}): {' '.join(group_texts)}")
