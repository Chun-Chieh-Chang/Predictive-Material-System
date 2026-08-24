import json

with open('scratch/spans.json', 'r', encoding='utf-8') as f:
    spans = json.load(f)

# Sort spans by y0, then x0
spans = sorted(spans, key=lambda s: (s['bbox'][1], s['bbox'][0]))

# Let's inspect headers (y0 < 48)
headers = [s for s in spans if s['bbox'][1] < 48]
print(f"Header spans ({len(headers)}):")
for s in headers:
    print(f"  {s['bbox']}: {s['text']}")

# Let's see unique rows by finding y0 clustering for materials (x in 65..126)
models = [s for s in spans if 65 <= (s['bbox'][0]+s['bbox'][2])/2 <= 126 and s['bbox'][1] > 45]
print(f"\nFound {len(models)} model entries:")
for m in models:
    print(f"  y={m['bbox'][1]:.1f}..{m['bbox'][3]:.1f}, x={m['bbox'][0]:.1f}..{m['bbox'][2]:.1f}: {m['text']}")
