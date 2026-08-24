import json
import sys
import io
import os
import urllib.parse
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

sys.stdout.reconfigure(encoding='utf-8')

# Load json data
with open('scratch/pdf_raw.json', 'r', encoding='utf-8') as f:
    raw_data = json.load(f)

with open('scratch/spans.json', 'r', encoding='utf-8') as f:
    spans = json.load(f)

with open('scratch/links.json', 'r', encoding='utf-8') as f:
    links = json.load(f)

col_defs = [
    {"name": "原料種類", "sub": "Category", "x0": 14.0, "x1": 36.5},
    {"name": "廠商", "sub": "Manufacturer", "x0": 36.5, "x1": 65.5},
    {"name": "型號", "sub": "Grade/Model", "x0": 65.5, "x1": 126.2},
    {"name": "顏色", "sub": "Color", "x0": 126.2, "x1": 138.7},
    {"name": "物理性資料", "sub": "TECHNICAL DATA SHEET", "x0": 138.7, "x1": 160.8},
    {"name": "物質安全資料", "sub": "MSDS / SDS", "x0": 160.8, "x1": 186.7},
    {"name": "生物相容性資料", "sub": "BIO (ISO 10993)", "x0": 186.7, "x1": 226.5},
    {"name": "動物性成分資料", "sub": "Animal Origin (BSE/TSE)", "x0": 226.5, "x1": 253.4},
    {"name": "塑化劑", "sub": "Phthalates", "x0": 253.4, "x1": 277.9},
    {"name": "REACH", "sub": "SVHC", "x0": 277.9, "x1": 306.5},
    {"name": "REACH", "sub": "Annex XIV", "x0": 306.5, "x1": 332.4},
    {"name": "REACH", "sub": "Annex XVII", "x0": 332.4, "x1": 358.3},
    {"name": "CLP", "sub": "CLP", "x0": 358.3, "x1": 385.9},
    {"name": "RoHS", "sub": "RoHS", "x0": 385.9, "x1": 409.9},
    {"name": "LatexFree", "sub": "LatexFree", "x0": 409.9, "x1": 428.4},
    {"name": "FDA21CFR", "sub": "FDA21CFR", "x0": 428.4, "x1": 446.9},
    {"name": "PFAS", "sub": "PFAS", "x0": 446.9, "x1": 473.3},
    {"name": "雙酚A", "sub": "BPA", "x0": 473.3, "x1": 497.5},
    {"name": "美國藥典(第六級)", "sub": "USP(CLASS VI)", "x0": 497.5, "x1": 526.8},
    {"name": "加州 65 號法案", "sub": "California Proposition 65", "x0": 526.8, "x1": 552.5},
    {"name": "衝突礦物", "sub": "Conflict Minerals free", "x0": 552.5, "x1": 575.0},
    {"name": "奈米材料", "sub": "Nanomaterial", "x0": 575.0, "x1": 601.9},
    {"name": "成型技術文件", "sub": "Molding Tech Doc", "x0": 601.9, "x1": 631.2},
    {"name": "POPs Regulation", "sub": "(EU) 2019/1021", "x0": 631.2, "x1": 660.5},
    {"name": "MDR CMR / ATPxx", "sub": "MDR CMR / ATPxx", "x0": 660.5, "x1": 689.7},
    {"name": "其它", "sub": "Other", "x0": 689.7, "x1": 813.1},
]

# Row Y divider lines
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
merged_y = []
for y in h_y:
    if not merged_y or y - merged_y[-1] > 1.0:
        merged_y.append(y)

cat_bounds = [
    (47.3, 110.1, "ABS (A)"),
    (110.1, 283.4, "PVC (B)"),
    (283.4, 323.7, "PC (C)"),
    (323.7, 347.5, "PE (D)"),
    (347.5, 387.8, "PP (E)"),
    (387.8, 401.3, "PBT (F)"),
    (401.3, 420.5, "TPE (G)"),
    (420.5, 430.3, "Copolyester (H)"),
    (430.3, 451.7, "Acrylic-Polycarbonate Alloys (I)"),
    (451.7, 461.5, "SBC (J)"),
    (461.5, 476.4, "(K)"),
    (476.4, 503.3, "(L)"),
]

mfg_bounds = [
    (47.3, 59.3, "TORAY (A01)"),
    (59.3, 79.4, "TAITA (台達) (A02)"),
    (79.4, 110.1, "INEOS (A03)"),
    (110.1, 190.8, "NAN YA(南亞) (B01)"),
    (190.8, 217.7, "COLORITE (TEKNIPLEX) (B02)"),
    (217.7, 235.4, "Formerra (PolyOne) (B03)"),
    (235.4, 249.8, "axiall (B04)"),
    (249.8, 259.7, "Benison (本源興) (B05)"),
    (259.7, 270.0, "JIEH-MING (介明) (B06)"),
    (270.0, 283.4, "TEKNOR APEX (B07)"),
    (283.4, 317.0, "covestro (Bayer) (C01)"),
    (317.0, 323.7, "SABIC (C02)"),
    (323.7, 337.2, "USI (台聚) (D01)"),
    (337.2, 347.5, "lyondellbasell industries (D02)"),
    (347.5, 367.7, "LCY (李長榮) (E01)"),
    (367.7, 381.1, "Bormed (E02)"),
    (381.1, 387.8, "ELINT HILLS (E03)"),
    (387.8, 401.3, "SABIC (F01)"),
    (401.3, 420.5, "Saint-Gobain Performance Plastics (G01)"),
    (420.5, 430.3, "EASTMAN (H01)"),
    (430.3, 451.7, "EVONIK (I01)"),
    (451.7, 461.5, "INEOS (J01)"),
    (461.5, 476.4, "ZEON / Lucky Seal (K01)"),
    (476.4, 503.3, "GVS (L01)"),
]

# Model name fixups where text trailing parenthesis was clipped by bounding box
def clean_model_name(name):
    name = name.strip()
    if name.endswith('(C0101'): name = name + ')'
    elif name.endswith('(C0102'): name = name + ')'
    elif name.endswith('(C0104'): name = name + ')'
    elif name.startswith('® CYREX'): name = 'CYREX® ' + name.replace('® CYREX', '').strip()
    elif name.startswith('® C-Flex'): name = 'C-Flex® ' + name.replace('® C-Flex', '').strip()
    elif name.startswith('TM VALOX'): name = 'VALOX™ ' + name.replace('TM VALOX', '').strip()
    return name

# Parse all 45 material rows
rows_data = []
all_detail_records = []

for i in range(len(merged_y)-2):
    yt = merged_y[i]
    yb = merged_y[i+1]
    
    cat = ""
    for cb in cat_bounds:
        if (yt + yb)/2 >= cb[0] - 0.5 and (yt + yb)/2 <= cb[1] + 0.5:
            cat = cb[2]
            break
            
    mfg = ""
    for mb in mfg_bounds:
        if (yt + yb)/2 >= mb[0] - 0.5 and (yt + yb)/2 <= mb[1] + 0.5:
            mfg = mb[2]
            break
            
    row_dict = {"原料種類": cat, "廠商": mfg}
    row_links = {}
    
    for c in col_defs[2:]:
        cname = c['name']
        col_header_full = f"{c['name']} ({c['sub']})" if c['sub'] != c['name'] else c['name']
        
        # find spans
        c_spans = []
        for s in spans:
            if s['bbox'][1] >= 47:
                xc = (s['bbox'][0] + s['bbox'][2]) / 2
                yc = (s['bbox'][1] + s['bbox'][3]) / 2
                if yt - 0.8 <= yc < yb + 0.8 and c['x0'] - 0.5 <= xc < c['x1'] + 0.5:
                    c_spans.append(s)
        
        # Group spans by line
        lines_in_cell = []
        c_spans_sorted = sorted(c_spans, key=lambda s: (s['bbox'][1], s['bbox'][0]))
        for s in c_spans_sorted:
            if not lines_in_cell:
                lines_in_cell.append([s])
            else:
                last_line_y = sum([x['bbox'][1] for x in lines_in_cell[-1]]) / len(lines_in_cell[-1])
                if abs(s['bbox'][1] - last_line_y) < 2.5:
                    lines_in_cell[-1].append(s)
                else:
                    lines_in_cell.append([s])
        
        line_texts = []
        for l in lines_in_cell:
            l = sorted(l, key=lambda s: s['bbox'][0])
            line_texts.append(" ".join([s['text'] for s in l]))
        
        cell_text = "\n".join(line_texts)
        if cname == '型號':
            cell_text = clean_model_name(cell_text)
        row_dict[cname] = cell_text
        
        # Find links in this cell
        c_links = []
        for lk in links:
            l_xc = (lk['bbox'][0] + lk['bbox'][2]) / 2
            l_yc = (lk['bbox'][1] + lk['bbox'][3]) / 2
            if yt - 0.8 <= l_yc < yb + 0.8 and c['x0'] - 0.5 <= l_xc < c['x1'] + 0.5:
                c_links.append(lk)
        
        if c_links:
            row_links[cname] = c_links
            
    rows_data.append({
        'row_idx': i,
        'cat': cat,
        'mfg': mfg,
        'cells': row_dict,
        'links': row_links
    })

# Build detail records for Sheet 2
for r in rows_data:
    cat = r['cat']
    mfg = r['mfg']
    model = r['cells']['型號']
    color = r['cells']['顏色']
    
    for c in col_defs[4:]: # columns with documents / certificates
        cname = c['name']
        col_header = f"{c['name']} ({c['sub']})" if c['sub'] != c['name'] else c['name']
        cell_val = r['cells'].get(cname, '')
        cell_links = r['links'].get(cname, [])
        
        if not cell_val:
            continue
            
        if cell_val == 'X':
            all_detail_records.append({
                '原料種類': cat,
                '廠商': mfg,
                '型號': model,
                '顏色': color,
                '檢驗/文件類別': col_header,
                '文件編號/狀態': 'X (無提供/不適用)',
                '備註': '',
                '下載連結': '',
                '檔案名稱': ''
            })
        else:
            # If there are links, record each link
            if cell_links:
                for lk in cell_links:
                    uri = lk['uri']
                    fname = os.path.basename(urllib.parse.unquote(uri))
                    # Check text overlapping this specific link
                    lk_text = lk.get('overlapping_text', '')
                    all_detail_records.append({
                        '原料種類': cat,
                        '廠商': mfg,
                        '型號': model,
                        '顏色': color,
                        '檢驗/文件類別': col_header,
                        '文件編號/狀態': cell_val.replace('\n', ' ; '),
                        '備註': lk_text if lk_text != cell_val else '',
                        '下載連結': uri,
                        '檔案名稱': fname
                    })
            else:
                all_detail_records.append({
                    '原料種類': cat,
                    '廠商': mfg,
                    '型號': model,
                    '顏色': color,
                    '檢驗/文件類別': col_header,
                    '文件編號/狀態': cell_val.replace('\n', ' ; '),
                    '備註': '',
                    '下載連結': '',
                    '檔案名稱': ''
                })

print(f"Prepared {len(rows_data)} main rows and {len(all_detail_records)} detail records.")
