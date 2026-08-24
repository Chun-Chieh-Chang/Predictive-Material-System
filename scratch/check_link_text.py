import json
import sys
import io
import urllib.parse

sys.stdout.reconfigure(encoding='utf-8')

with open('scratch/pdf_raw.json', 'r', encoding='utf-8') as f:
    raw_data = json.load(f)

with open('scratch/spans.json', 'r', encoding='utf-8') as f:
    spans = json.load(f)

with open('scratch/links.json', 'r', encoding='utf-8') as f:
    links = json.load(f)

# Let's inspect every link URL and what text overlaps it
for lk in links:
    bbox = lk['bbox']
    # find spans inside or overlapping this link bbox
    matching_spans = []
    for s in spans:
        sb = s['bbox']
        # check overlap
        if not (sb[2] < bbox[0] or sb[0] > bbox[2] or sb[3] < bbox[1] or sb[1] > bbox[3]):
            matching_spans.append(s['text'])
    lk['overlapping_text'] = " ".join(matching_spans)

print(f"Total links: {len(links)}")
# Print samples
for lk in links[:30]:
    print(f"Text: '{lk['overlapping_text']}' -> URL: {lk['uri']}")
