import json
import sys
import io
import urllib.parse

sys.stdout.reconfigure(encoding='utf-8')

with open('scratch/color_powder_p1_raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

spans = data['spans']
links = data['links']

# 23 columns
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

# Row Y bounds
row_y = [
    197.1, 215.6, 234.2, 252.8, 271.4, 289.9, 308.5, 327.1, 345.7, 364.3, 
    382.9, 401.4, 420.0, 438.6, 457.2, 475.8, 494.3, 512.9, 531.5, 550.1, 
    568.7, 587.2, 605.8, 624.4, 643.0, 661.6, 680.1, 698.7, 717.3, 735.9, 
    754.5, 773.0, 791.6, 810.2, 826.5, 842.7, 859.0, 875.2
]

# Group bounds for col 0 (色粉料號)
# Let's inspect what spans are in col 0 for each row interval
for r_idx in range(len(row_y)-1):
    yt, yb = row_y[r_idx], row_y[r_idx+1]
    row_spans = [s for s in spans if yt - 2.0 <= (s['bbox'][1]+s['bbox'][3])/2 < yb + 2.0 and s['bbox'][1] >= 180]
    
    # Col 0 (色粉料號)
    col0_spans = [s for s in spans if 90.0 <= (s['bbox'][0]+s['bbox'][2])/2 <= 151.4 and yt - 2.0 <= (s['bbox'][1]+s['bbox'][3])/2 <= yb + 2.0 and s['bbox'][1] >= 180]
    col0_text = " ".join([s['text'] for s in col0_spans])
    
    # Ingredient
    comp_spans = [s for s in spans if 151.4 <= (s['bbox'][0]+s['bbox'][2])/2 <= 259.8 and yt - 2.0 <= (s['bbox'][1]+s['bbox'][3])/2 <= yb + 2.0 and s['bbox'][1] >= 180]
    comp_text = " ".join([s['text'] for s in comp_spans])
    
    # Mfg
    mfg_spans = [s for s in spans if 259.8 <= (s['bbox'][0]+s['bbox'][2])/2 <= 416.1 and yt - 2.0 <= (s['bbox'][1]+s['bbox'][3])/2 <= yb + 2.0 and s['bbox'][1] >= 180]
    mfg_text = " ".join([s['text'] for s in mfg_spans])
    
    # Raw material name
    raw_spans = [s for s in spans if 416.1 <= (s['bbox'][0]+s['bbox'][2])/2 <= 572.5 and yt - 2.0 <= (s['bbox'][1]+s['bbox'][3])/2 <= yb + 2.0 and s['bbox'][1] >= 180]
    raw_text = " ".join([s['text'] for s in raw_spans])
    
    # Ratio
    ratio_spans = [s for s in spans if 572.5 <= (s['bbox'][0]+s['bbox'][2])/2 <= 640.7 and yt - 2.0 <= (s['bbox'][1]+s['bbox'][3])/2 <= yb + 2.0 and s['bbox'][1] >= 180]
    ratio_text = " ".join([s['text'] for s in ratio_spans])
    
    print(f"Row {r_idx:2d} (y={yt:.1f}..{yb:.1f}): Code='{col0_text:<8}' | Comp='{comp_text:<20}' | Mfg='{mfg_text:<25}' | Raw='{raw_text:<30}' | Ratio='{ratio_text}'")
