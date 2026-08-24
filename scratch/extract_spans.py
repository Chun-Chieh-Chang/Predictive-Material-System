import sys
import io
import json
import pymupdf
import pandas as pd
import openpyxl

pdf_path = r'c:\Users\USER\Downloads\Project\Predictive-Material-System\新增資料夾\原料\塑膠原料資料表.pdf'
doc = pymupdf.open(pdf_path)
page = doc[0]

text_instances = []
for block in page.get_text('dict')['blocks']:
    if block.get('type') == 0:  # text block
        for line in block['lines']:
            for span in line['spans']:
                text = span['text'].strip()
                if text:
                    text_instances.append({
                        'bbox': [round(x, 2) for x in span['bbox']],
                        'text': text,
                        'font': span['font'],
                        'size': round(span['size'], 2)
                    })

with open('scratch/spans.json', 'w', encoding='utf-8') as f:
    json.dump(text_instances, f, ensure_ascii=False, indent=2)

print(f'Saved {len(text_instances)} text spans to scratch/spans.json')
