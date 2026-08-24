import pymupdf
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r'c:\Users\USER\Downloads\Project\Predictive-Material-System\新增資料夾\原料\塑膠原料資料表.pdf'
doc = pymupdf.open(pdf_path)
page = doc[0]

links = page.get_links()
print(f"Total links found: {len(links)}")
for i, link in enumerate(links[:20]):
    print(f"Link {i+1}: from={link.get('from')}, uri={link.get('uri')}, page={link.get('page')}, file={link.get('file')}")

with open('scratch/links.json', 'w', encoding='utf-8') as f:
    json.dump(links, f, ensure_ascii=False, indent=2)
