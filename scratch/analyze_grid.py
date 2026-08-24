import json
import sys
import io

sys.stdout.reconfigure(encoding='utf-8')

with open('scratch/pdf_raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

with open('scratch/spans.json', 'r', encoding='utf-8') as f:
    spans = json.load(f)

# The column boundaries from header x coordinates:
# Let's inspect the distinct x intervals:
# x0=14.6..36.5 (Col 0: 原料種類 / Material Category)
# x1=36.5..65.5 (Col 1: 廠商 / Manufacturer)
# x2=65.5..126.2 (Col 2: 型號 / Grade / Model)
# x3=126.2..138.7 (Col 3: 顏色 / Color)
# x4=138.7..160.8 (Col 4: 物理性資料 / TECHNICAL DATA SHEET)
# x5=160.8..186.7 (Col 5: 物質安全資料 / MSDS/SDS)
# x6=186.7..226.5 (Col 6: 生物相容性資料 / BIO (ISO 10993))
# x7=226.5..253.4 (Col 7: 動物性成分資料 / Animal Origin (BSE/TSE))
# x8=253.4..277.9 (Col 8: 塑化劑 / Phthalates)
# x9=277.9..306.5 (Col 9: REACH / SVHC)
# x10=306.5..332.4 (Col 10: REACH / Annex XIV)
# x11=332.4..358.3 (Col 11: REACH / Annex XVII)
# x12=358.3..385.9 (Col 12: CLP)
# x13=385.9..409.9 (Col 13: RoHS)
# x14=409.9..428.4 (Col 14: LatexFree)
# x15=428.4..446.9 (Col 15: FDA21CFR)
# x16=446.9..473.3 (Col 16: PFAS)
# x17=473.3..497.5 (Col 17: 雙酚A / BPA)
# x18=497.5..526.8 (Col 18: 美國藥典(第六級) / USP(CLASS VI))
# x19=526.8..552.5 (Col 19: 加州65號法案 / California Proposition 65)
# x20=552.5..575.0 (Col 20: 衝突礦物 / Conflict Minerals free)
# x21=575.0..601.9 (Col 21: 奈米材料 / Nanomaterial)
# x22=601.9..631.2 (Col 22: 成型技術文件)
# x23=631.2..660.5 (Col 23: POPs Regulation (EU) 2019/1021)
# x24=660.5..689.7 (Col 24: MDR CMR / ATPxx)
# x25=689.7..813.1 (Col 25: 其它 / Other)

col_definitions = [
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

print(f"Total Columns: {len(col_definitions)}")

# Let's find horizontal row grid lines from data['lines']
# Specifically horizontal lines between x=65 and x=138 (model / color area)
model_h_lines = []
for l in data['lines']:
    if l['type'] == 'l':
        x1, y1 = l['p1']
        x2, y2 = l['p2']
        if abs(y1 - y2) < 0.5 and min(x1, x2) <= 70 and max(x1, x2) >= 120 and y1 >= 45:
            model_h_lines.append(round((y1+y2)/2, 1))
    elif l['type'] == 're':
        x0, y0, x1, y1 = l['rect']
        if x0 <= 70 and x1 >= 120 and y0 >= 45:
            model_h_lines.append(round(y0, 1))
            model_h_lines.append(round(y1, 1))

model_h_lines = sorted(list(set(model_h_lines)))
print(f"Row divider lines Y ({len(model_h_lines)}):", model_h_lines)
