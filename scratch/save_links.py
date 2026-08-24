import pymupdf
import json
import sys
import urllib.parse

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r'c:\Users\USER\Downloads\Project\Predictive-Material-System\新增資料夾\原料\塑膠原料資料表.pdf'
doc = pymupdf.open(pdf_path)
page = doc[0]

# Extract all links
links = page.get_links()
serializable_links = []
for l in links:
    r = l.get('from')
    uri = l.get('uri', '')
    if uri:
        # unquote url
        decoded_uri = urllib.parse.unquote(uri)
    else:
        decoded_uri = ''
    serializable_links.append({
        'bbox': [round(r.x0, 2), round(r.y0, 2), round(r.x1, 2), round(r.y1, 2)],
        'uri': uri,
        'decoded_uri': decoded_uri
    })

print(f"Total links: {len(serializable_links)}")

with open('scratch/links.json', 'w', encoding='utf-8') as f:
    json.dump(serializable_links, f, ensure_ascii=False, indent=2)

print("Saved scratch/links.json")
