import pymupdf
import json
import os
import sys
import urllib.parse

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r'c:\Users\USER\Downloads\Project\Predictive-Material-System\新增資料夾\原料\色粉資料表.pdf'
doc = pymupdf.open(pdf_path)

print(f"Total pages: {len(doc)}")
for i in range(len(doc)):
    page = doc[i]
    print(f"\n=== PAGE {i+1} (rect: {page.rect}) ===")
    
    # Text spans
    spans = []
    for b in page.get_text('dict')['blocks']:
        if b.get('type') == 0:
            for l in b['lines']:
                for s in l['spans']:
                    t = s['text'].strip()
                    if t:
                        spans.append({
                            'bbox': [round(x, 2) for x in s['bbox']],
                            'text': t,
                            'font': s['font'],
                            'size': round(s['size'], 2)
                        })
    print(f"Total text spans on page {i+1}: {len(spans)}")
    
    # Links
    links = page.get_links()
    print(f"Total links on page {i+1}: {len(links)}")
    serializable_links = []
    for lk in links:
        r = lk.get('from')
        uri = lk.get('uri', '')
        serializable_links.append({
            'bbox': [round(r.x0, 2), round(r.y0, 2), round(r.x1, 2), round(r.y1, 2)],
            'uri': uri,
            'decoded_uri': urllib.parse.unquote(uri) if uri else ''
        })
        
    # Render page image
    pix = page.get_pixmap(dpi=150)
    pix.save(f'scratch/color_powder_page{i+1}.png')
    
    # Save raw json for page
    with open(f'scratch/color_powder_p{i+1}_raw.json', 'w', encoding='utf-8') as f:
        json.dump({
            'rect': [page.rect.x0, page.rect.y0, page.rect.x1, page.rect.y1],
            'spans': spans,
            'links': serializable_links,
            'lines': [{'type': 'l', 'p1': (round(it[1].x, 2), round(it[1].y, 2)), 'p2': (round(it[2].x, 2), round(it[2].y, 2))} 
                      for d in page.get_drawings() for it in d['items'] if it[0] == 'l'] +
                     [{'type': 're', 'rect': [round(it[1].x0, 2), round(it[1].y0, 2), round(it[1].x1, 2), round(it[1].y1, 2)]} 
                      for d in page.get_drawings() for it in d['items'] if it[0] == 're']
        }, f, ensure_ascii=False, indent=2)

print("Saved raw data and images successfully.")
