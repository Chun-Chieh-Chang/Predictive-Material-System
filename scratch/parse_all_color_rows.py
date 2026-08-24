import json
import sys
import io
import urllib.parse

sys.stdout.reconfigure(encoding='utf-8')

with open('scratch/color_powder_p1_raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

spans = data['spans']
links = data['links']

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

row_y = [
    197.1, 215.6, 234.2, 252.8, 271.4, 289.9, 308.5, 327.1, 345.7, 364.3, 
    382.9, 401.4, 420.0, 438.6, 457.2, 475.8, 494.3, 512.9, 531.5, 550.1, 
    568.7, 587.2, 605.8, 624.4, 643.0, 661.6, 680.1, 698.7, 717.3, 735.9, 
    754.5, 773.0, 791.6, 810.2, 826.5, 842.7, 859.0, 875.2
]

# Colorant code grouping bounds
group_bounds = [
    (197.1, 215.6, ""),
    (215.6, 252.8, "73016"),
    (252.8, 289.9, "66821"),
    (289.9, 327.1, "77504"),
    (327.1, 345.7, "90682"),
    (345.7, 382.9, "66923"),
    (382.9, 420.0, "78392"),
    (420.0, 457.2, "77507"),
    (457.2, 494.3, "62310"),
    (494.3, 531.5, "73081"),
    (531.5, 568.7, "78346"),
    (568.7, 605.8, "61335"),
    (605.8, 661.6, "78360"),
    (661.6, 680.1, "CL2220"),
    (680.1, 717.3, "66914"),
    (717.3, 773.0, "77515"),
    (773.0, 810.2, "66950A"),
    (810.2, 842.7, "77493"),
    (842.7, 859.0, "同原料名"),
    (859.0, 875.2, "8905"),
]

all_rows = []
for r_idx in range(len(row_y)-1):
    yt, yb = row_y[r_idx], row_y[r_idx+1]
    
    # Get group code
    code = ""
    for gb in group_bounds:
        if (yt + yb)/2 >= gb[0] - 2.0 and (yt + yb)/2 <= gb[1] + 2.0:
            code = gb[2]
            break
            
    row_dict = {"色粉料號": code}
    row_links = {}
    
    for c in col_defs[1:]: # from 成分
        cname = c['name']
        c_spans = []
        for s in spans:
            if s['bbox'][1] >= 180:
                xc = (s['bbox'][0] + s['bbox'][2]) / 2
                yc = (s['bbox'][1] + s['bbox'][3]) / 2
                if yt - 2.0 <= yc < yb + 2.0 and c['x0'] - 2.0 <= xc < c['x1'] + 2.0:
                    c_spans.append(s)
                    
        # Sort by x
        c_spans = sorted(c_spans, key=lambda s: s['bbox'][0])
        cell_text = " ".join([s['text'] for s in c_spans])
        row_dict[cname] = cell_text
        
        # Check links
        c_links = []
        for lk in links:
            l_xc = (lk['bbox'][0] + lk['bbox'][2]) / 2
            l_yc = (lk['bbox'][1] + lk['bbox'][3]) / 2
            if yt - 2.0 <= l_yc < yb + 2.0 and c['x0'] - 2.0 <= l_xc < c['x1'] + 2.0:
                c_links.append(lk)
        if c_links:
            row_links[cname] = c_links
            
    all_rows.append({
        'row_idx': r_idx,
        'code': code,
        'cells': row_dict,
        'links': row_links
    })

print(f"Constructed {len(all_rows)} rows successfully.")
for r in all_rows[:10]:
    print(f"Row {r['row_idx']:2d} | Code: {r['code']:<8} | Comp: {r['cells']['成分']:<16} | Mfg: {r['cells']['製造商']:<25} | Name: {r['cells']['原料名']:<25} | Ratio: {r['cells']['比例']:<5} | MSDS: {r['cells']['MSDS / SDS']:<35} | TDS: {r['cells']['TDS']}")
