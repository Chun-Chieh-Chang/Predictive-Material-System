import json
import sys
import io
import pandas as pd
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

with open('scratch/pdf_raw.json', 'r', encoding='utf-8') as f:
    raw_data = json.load(f)

with open('scratch/spans.json', 'r', encoding='utf-8') as f:
    spans = json.load(f)

# Col definitions:
col_defs = [
    {"name": "原料種類", "x0": 14.0, "x1": 36.5},
    {"name": "廠商", "x0": 36.5, "x1": 65.5},
    {"name": "型號", "x0": 65.5, "x1": 126.2},
    {"name": "顏色", "x0": 126.2, "x1": 138.7},
    {"name": "物理性資料 (TECHNICAL DATA SHEET)", "x0": 138.7, "x1": 160.8},
    {"name": "物質安全資料 (MSDS / SDS)", "x0": 160.8, "x1": 186.7},
    {"name": "生物相容性資料 (BIO ISO 10993)", "x0": 186.7, "x1": 226.5},
    {"name": "動物性成分資料 (Animal Origin BSE/TSE)", "x0": 226.5, "x1": 253.4},
    {"name": "塑化劑 (Phthalates)", "x0": 253.4, "x1": 277.9},
    {"name": "REACH (SVHC)", "x0": 277.9, "x1": 306.5},
    {"name": "REACH (Annex XIV)", "x0": 306.5, "x1": 332.4},
    {"name": "REACH (Annex XVII)", "x0": 332.4, "x1": 358.3},
    {"name": "CLP", "x0": 358.3, "x1": 385.9},
    {"name": "RoHS", "x0": 385.9, "x1": 409.9},
    {"name": "LatexFree", "x0": 409.9, "x1": 428.4},
    {"name": "FDA21CFR", "x0": 428.4, "x1": 446.9},
    {"name": "PFAS", "x0": 446.9, "x1": 473.3},
    {"name": "雙酚A (BPA)", "x0": 473.3, "x1": 497.5},
    {"name": "美國藥典第六級 (USP CLASS VI)", "x0": 497.5, "x1": 526.8},
    {"name": "加州65號法案 (California Prop 65)", "x0": 526.8, "x1": 552.5},
    {"name": "衝突礦物 (Conflict Minerals free)", "x0": 552.5, "x1": 575.0},
    {"name": "奈米材料 (Nanomaterial)", "x0": 575.0, "x1": 601.9},
    {"name": "成型技術文件", "x0": 601.9, "x1": 631.2},
    {"name": "POPs Regulation (EU) 2019/1021", "x0": 631.2, "x1": 660.5},
    {"name": "MDR CMR / ATPxx", "x0": 660.5, "x1": 689.7},
    {"name": "其它", "x0": 689.7, "x1": 813.1},
]

# Extract all horizontal lines between x=65 and x=138 (model column borders)
h_y = []
for l in raw_data['lines']:
    if l['type'] == 'l':
        x1, y1 = l['p1']
        x2, y2 = l['p2']
        if abs(y1 - y2) < 0.5 and min(x1, x2) <= 70 and max(x1, x2) >= 120 and y1 >= 45:
            h_y.append((y1+y2)/2)
    elif l['type'] == 're':
        x0, y0, x1, y1 = l['rect']
        if x0 <= 70 and x1 >= 120 and y0 >= 45:
            h_y.append(y0)
            h_y.append(y1)

h_y = sorted(list(set([round(y, 1) for y in h_y])))

# Merge close y values (< 1.0)
merged_y = []
for y in h_y:
    if not merged_y or y - merged_y[-1] > 1.0:
        merged_y.append(y)

print(f"Row boundaries Y ({len(merged_y)} points -> {len(merged_y)-1} rows):")
for i, y in enumerate(merged_y):
    print(f"  Bound {i}: y={y}")

rows = []
for i in range(len(merged_y)-1):
    y_top = merged_y[i]
    y_bot = merged_y[i+1]
    rows.append((y_top, y_bot))

print(f"\nTotal material rows: {len(rows)}")

# Now for each row, let's see what spans fall inside each column:
# A span center: xc = (x0+x1)/2, yc = (y0+y1)/2
grid = []
for r_idx, (yt, yb) in enumerate(rows):
    row_data = {c['name']: [] for c in col_defs}
    # spans inside this row:
    for s in spans:
        if s['bbox'][1] >= 47: # below header
            xc = (s['bbox'][0] + s['bbox'][2]) / 2
            yc = (s['bbox'][1] + s['bbox'][3]) / 2
            
            # check if yc is in [yt - 1.0, yb + 1.0]
            # Note: For merged cells across multiple rows (like category or manufacturer), we will handle separately
            if yt - 0.5 <= yc < yb + 0.5:
                # Find column
                for c in col_defs:
                    if c['x0'] - 0.5 <= xc < c['x1'] + 0.5:
                        row_data[c['name']].append(s['text'])
                        break
    grid.append(row_data)

# Let's inspect rows 0 to 10
for r_idx in range(min(15, len(grid))):
    model = " ".join(grid[r_idx]['型號'])
    color = " ".join(grid[r_idx]['顏色'])
    mfg = " ".join(grid[r_idx]['廠商'])
    cat = " ".join(grid[r_idx]['原料種類'])
    print(f"Row {r_idx:2d} (y={rows[r_idx][0]:.1f}..{rows[r_idx][1]:.1f}): Cat='{cat}', Mfg='{mfg}', Model='{model}', Color='{color}'")
