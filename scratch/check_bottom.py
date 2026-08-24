import json
import sys
import io
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

with open('scratch/pdf_raw.json', 'r', encoding='utf-8') as f:
    raw_data = json.load(f)

with open('scratch/spans.json', 'r', encoding='utf-8') as f:
    spans = json.load(f)

# Let's inspect all spans near the bottom (y > 500)
print("=== Spans with y > 500 ===")
bottom_spans = [s for s in spans if s['bbox'][1] >= 500]
for s in bottom_spans:
    print(f"  bbox={s['bbox']}: text={s['text']}")
