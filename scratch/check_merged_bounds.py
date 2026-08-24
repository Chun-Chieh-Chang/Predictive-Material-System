import json
import sys
import io
import pandas as pd

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

# Find horizontal lines in Category column (x in 14..36.5)
cat_h_lines = []
for l in raw_data['lines']:
    if l['type'] == 'l':
        x1, y1 = l['p1']
        x2, y2 = l['p2']
        if abs(y1 - y2) < 0.5 and min(x1, x2) <= 20 and max(x1, x2) >= 30 and y1 >= 45:
            cat_h_lines.append(round((y1+y2)/2, 1))
    elif l['type'] == 're':
        x0, y0, x1, y1 = l['rect']
        if x0 <= 20 and x1 >= 30 and y0 >= 45:
            cat_h_lines.append(round(y0, 1))
            cat_h_lines.append(round(y1, 1))

cat_h_lines = sorted(list(set(cat_h_lines)))
merged_cat_y = []
for y in cat_h_lines:
    if not merged_cat_y or y - merged_cat_y[-1] > 1.0:
        merged_cat_y.append(y)

print(f"Category Boundaries ({len(merged_cat_y)} lines -> {len(merged_cat_y)-1} categories):")
for i in range(len(merged_cat_y)-1):
    yt, yb = merged_cat_y[i], merged_cat_y[i+1]
    cat_texts = [s['text'] for s in spans if 14.0 <= (s['bbox'][0]+s['bbox'][2])/2 <= 36.5 and yt - 0.5 <= (s['bbox'][1]+s['bbox'][3])/2 <= yb + 0.5 and s['bbox'][1] >= 47]
    print(f"  Cat {i}: y={yt:.1f}..{yb:.1f} -> {' '.join(cat_texts)}")

# Find horizontal lines in Mfg column (x in 36.5..65.5)
mfg_h_lines = []
for l in raw_data['lines']:
    if l['type'] == 'l':
        x1, y1 = l['p1']
        x2, y2 = l['p2']
        if abs(y1 - y2) < 0.5 and min(x1, x2) <= 40 and max(x1, x2) >= 60 and y1 >= 45:
            mfg_h_lines.append(round((y1+y2)/2, 1))
    elif l['type'] == 're':
        x0, y0, x1, y1 = l['rect']
        if x0 <= 40 and x1 >= 60 and y0 >= 45:
            mfg_h_lines.append(round(y0, 1))
            mfg_h_lines.append(round(y1, 1))

mfg_h_lines = sorted(list(set(mfg_h_lines)))
merged_mfg_y = []
for y in mfg_h_lines:
    if not merged_mfg_y or y - merged_mfg_y[-1] > 1.0:
        merged_mfg_y.append(y)

print(f"\nManufacturer Boundaries ({len(merged_mfg_y)} lines -> {len(merged_mfg_y)-1} manufacturers):")
for i in range(len(merged_mfg_y)-1):
    yt, yb = merged_mfg_y[i], merged_mfg_y[i+1]
    mfg_texts = [s['text'] for s in spans if 36.5 <= (s['bbox'][0]+s['bbox'][2])/2 <= 65.5 and yt - 0.5 <= (s['bbox'][1]+s['bbox'][3])/2 <= yb + 0.5 and s['bbox'][1] >= 47]
    print(f"  Mfg {i}: y={yt:.1f}..{yb:.1f} -> {' '.join(mfg_texts)}")
