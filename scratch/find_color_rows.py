import json
import sys
import io

sys.stdout.reconfigure(encoding='utf-8')

with open('scratch/color_powder_p1_raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

spans = data['spans']
links = data['links']
lines = data['lines']

# Column definitions (23 columns)
col_defs = [
    {"name": "色粉料號", "sub": "Colorant Code", "x0": 90.0, "x1": 151.4},
    {"name": "成分", "sub": "Composition", "x0": 151.4, "x1": 259.8},
    {"name": "製造商", "sub": "Manufacturer", "x0": 259.8, "x1": 416.1},
    {"name": "原料名", "sub": "Raw Material Name", "x0": 416.1, "x1": 572.5},
    {"name": "比例", "sub": "SUM of Proportion", "x0": 572.5, "x1": 640.7},
    {"name": "MSDS / SDS", "sub": "MSDS / SDS", "x0": 640.7, "x1": 999.9},
    {"name": "TDS", "sub": "TDS", "x0": 999.9, "x1": 1087.4},
    {"name": "Animal origin", "sub": "Animal origin", "x0": 1087.4, "x1": 1185.7},
    {"name": "Phthalates", "sub": "Phthalates", "x0": 1185.7, "x1": 1284.0},
    {"name": "REACH SVHC", "sub": "REACH SVHC", "x0": 1284.0, "x1": 1382.3},
    {"name": "REACH AnnexXIV", "sub": "REACH AnnexXIV", "x0": 1382.3, "x1": 1480.7},
    {"name": "REACH AnnexXVII", "sub": "REACH AnnexXVII", "x0": 1480.7, "x1": 1579.0},
    {"name": "CLP", "sub": "CLP", "x0": 1579.0, "x1": 1677.3},
    {"name": "RoHS", "sub": "RoHS", "x0": 1677.3, "x1": 1775.6},
    {"name": "LatexFree", "sub": "LatexFree", "x0": 1775.6, "x1": 1874.0},
    {"name": "FDA21CFR", "sub": "FDA21CFR", "x0": 1874.0, "x1": 1972.3},
    {"name": "PFAS", "sub": "PFAS", "x0": 1972.3, "x1": 2070.6},
    {"name": "BPA", "sub": "BPA", "x0": 2070.6, "x1": 2168.9},
    {"name": "California Proposition 65", "sub": "California Proposition 65", "x0": 2168.9, "x1": 2267.2},
    {"name": "Conflict Minerals", "sub": "Conflict Minerals", "x0": 2267.2, "x1": 2365.6},
    {"name": "Nanomaterial", "sub": "Nanomaterial", "x0": 2365.6, "x1": 2463.9},
    {"name": "POPs", "sub": "POPs", "x0": 2463.9, "x1": 2562.2},
    {"name": "MDRCMR", "sub": "MDRCMR", "x0": 2562.2, "x1": 2660.5},
]

# Find horizontal lines between x=160 and x=500 (ingredient rows)
row_h_lines = []
for l in lines:
    if l['type'] == 'l':
        x1, y1 = l['p1']
        x2, y2 = l['p2']
        if abs(y1 - y2) < 2.0 and min(x1, x2) <= 160 and max(x1, x2) >= 500 and y1 >= 180:
            row_h_lines.append((y1+y2)/2)
    elif l['type'] == 're':
        x0, y0, x1, y1 = l['rect']
        if x0 <= 160 and x1 >= 500 and y0 >= 180:
            row_h_lines.append(y0)
            row_h_lines.append(y1)

row_h_lines = sorted(list(set([round(y, 1) for y in row_h_lines])))

# Merge close y values (< 3.0)
merged_y = []
for y in row_h_lines:
    if not merged_y or y - merged_y[-1] > 3.0:
        merged_y.append(y)

print(f"Found {len(merged_y)} row divider Y coords ({len(merged_y)-1} ingredient rows):")
for i, y in enumerate(merged_y):
    print(f"  Bound {i:2d}: y={y:.1f}")
