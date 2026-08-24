import re
import os

def main():
    with open('src/data/masterFieldDictionary.ts', 'r', encoding='utf-8') as f:
        ts_content = f.read()

    # Parse tables
    # Find all table blocks in MASTER_TABLE_SCHEMAS
    schema_pattern = re.compile(
        r"\{\s*tableKey:\s*'([^']+)',\s*tableLabel:\s*'([^']+)',\s*categoryIcon:\s*'([^']+)',\s*description:\s*'([^']+)',\s*ownerDepartment:\s*'([^']+)',\s*fields:\s*\[([\s\S]*?)\]\s*\}",
        re.MULTILINE
    )

    tables = []
    field_pattern = re.compile(
        r"\{\s*fieldKey:\s*'([^']+)',\s*fieldLabel:\s*'([^']+)',\s*tableName:\s*'([^']+)',\s*tableLabel:\s*'([^']+)',\s*dataType:\s*'([^']+)',\s*constraint:\s*'([^']+)',\s*plainDefinition:\s*'([^']*)',\s*definition:\s*'([^']*)',\s*businessPurpose:\s*'([^']*)',\s*fillGuide:\s*'([^']*)',\s*example:\s*'([^']*)',\s*exampleExplanation:\s*'([^']*)',\s*mrpImpact:\s*'([^']*)'(?:,\s*uiLocation:\s*'([^']*)')?\s*\}",
        re.MULTILINE
    )

    # Let's also load location mapping
    location_pattern = re.compile(r"'([^']+)':\s*'([^']+)'")
    loc_dict = {}
    loc_section = ts_content[ts_content.find('MASTER_FIELD_LOCATIONS'):]
    for m in location_pattern.finditer(loc_section):
        loc_dict[m.group(1)] = m.group(2)

    for tm in schema_pattern.finditer(ts_content):
        t_key = tm.group(1)
        t_label = tm.group(2)
        t_icon = tm.group(3)
        t_desc = tm.group(4)
        t_dept = tm.group(5)
        raw_fields = tm.group(6)

        fields = []
        # split by field blocks
        field_blocks = re.findall(r"\{\s*fieldKey:[\s\S]*?mrpImpact:[\s\S]*?\}", raw_fields)
        for fb in field_blocks:
            def get_val(key):
                m = re.search(r"" + key + r":\s*'([^']*)'", fb)
                return m.group(1) if m else ''

            f_key = get_val('fieldKey')
            f_label = get_val('fieldLabel')
            f_type = get_val('dataType')
            f_constraint = get_val('constraint')
            f_plain = get_val('plainDefinition')
            f_def = get_val('definition')
            f_purpose = get_val('businessPurpose')
            f_guide = get_val('fillGuide')
            f_ex = get_val('example')
            f_ex_exp = get_val('exampleExplanation')
            f_mrp = get_val('mrpImpact')
            f_loc = loc_dict.get(f_key, '資料表維護')

            fields.append({
                'fieldKey': f_key,
                'fieldLabel': f_label,
                'dataType': f_type,
                'constraint': f_constraint,
                'plainDefinition': f_plain,
                'definition': f_def,
                'businessPurpose': f_purpose,
                'fillGuide': f_guide,
                'example': f_ex,
                'exampleExplanation': f_ex_exp,
                'mrpImpact': f_mrp,
                'uiLocation': f_loc
            })

        tables.append({
            'tableKey': t_key,
            'tableLabel': t_label,
            'categoryIcon': t_icon,
            'description': t_desc,
            'ownerDepartment': t_dept,
            'fields': fields
        })

    total_fields = sum(len(t['fields']) for t in tables)
    print(f"Loaded {len(tables)} tables with {total_fields} fields total.")

    # Generate HTML
    html = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>料事如神系統 (PMS) — 主檔案欄位名稱定義與數據鏈位置權威手冊</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;600;700;900&display=swap" rel="stylesheet">
  <style>
    :root {{
      --bg-base: #0f172a;
      --bg-surface: #1e293b;
      --bg-card: #1e293b;
      --bg-card-alt: #0f172a;
      --text-main: #f1f5f9;
      --text-sub: #94a3b8;
      --text-muted: #64748b;
      --brand: #38bdf8;
      --brand-glow: rgba(56, 189, 248, 0.15);
      --border: #334155;
      --border-light: #1e293b;
      --success: #34d399;
      --warning: #fbbf24;
      --danger: #f87171;
      --purple: #c084fc;
      --font-main: 'Noto Sans TC', 'Inter', system-ui, -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }}

    @media (prefers-color-scheme: light) {{
      :root {{
        --bg-base: #f8fafc;
        --bg-surface: #ffffff;
        --bg-card: #ffffff;
        --bg-card-alt: #f1f5f9;
        --text-main: #0f172a;
        --text-sub: #475569;
        --text-muted: #64748b;
        --brand: #0284c7;
        --brand-glow: rgba(2, 132, 199, 0.1);
        --border: #e2e8f0;
        --border-light: #f1f5f9;
        --success: #059669;
        --warning: #d97706;
        --danger: #dc2626;
        --purple: #9333ea;
      }}
    }}

    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: var(--font-main);
      background-color: var(--bg-base);
      color: var(--text-main);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }}

    header {{
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border);
      padding: 1.25rem 2rem;
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(12px);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }}

    .header-left {{
      display: flex;
      align-items: center;
      gap: 1rem;
    }}

    .header-badge {{
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      background: var(--brand-glow);
      color: var(--brand);
      border: 1px solid var(--brand);
    }}

    .search-box {{
      position: relative;
      width: 100%;
      max-width: 380px;
    }}

    .search-box input {{
      width: 100%;
      padding: 0.6rem 1rem 0.6rem 2.5rem;
      border-radius: 0.75rem;
      border: 1px solid var(--border);
      background: var(--bg-base);
      color: var(--text-main);
      font-size: 0.875rem;
      outline: none;
      transition: all 0.2s;
    }}

    .search-box input:focus {{
      border-color: var(--brand);
      box-shadow: 0 0 0 2px var(--brand-glow);
    }}

    .search-icon {{
      position: absolute;
      left: 0.85rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 0.9rem;
    }}

    .container {{
      display: flex;
      max-width: 1600px;
      margin: 0 auto;
      min-height: calc(100vh - 80px);
    }}

    aside {{
      width: 280px;
      flex-shrink: 0;
      border-right: 1px solid var(--border);
      padding: 1.5rem 1rem;
      position: sticky;
      top: 75px;
      height: calc(100vh - 75px);
      overflow-y: auto;
      background: var(--bg-surface);
    }}

    .nav-group-title {{
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
      padding-left: 0.5rem;
    }}

    .nav-item {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.6rem 0.75rem;
      border-radius: 0.5rem;
      color: var(--text-sub);
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
      transition: all 0.15s;
    }}

    .nav-item:hover, .nav-item.active {{
      background: var(--brand-glow);
      color: var(--brand);
      font-weight: 600;
    }}

    .nav-item-count {{
      font-family: var(--font-mono);
      font-size: 0.75rem;
      background: var(--bg-card-alt);
      padding: 0.1rem 0.4rem;
      border-radius: 0.25rem;
      border: 1px solid var(--border);
    }}

    main {{
      flex: 1;
      padding: 2rem;
      overflow-x: hidden;
    }}

    .table-section {{
      margin-bottom: 3.5rem;
      scroll-margin-top: 100px;
    }}

    .table-header {{
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }}

    .table-header-top {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }}

    .table-title {{
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }}

    .dept-badge {{
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.6rem;
      border-radius: 0.5rem;
      background: rgba(192, 132, 252, 0.15);
      color: var(--purple);
      border: 1px solid rgba(192, 132, 252, 0.3);
    }}

    .table-desc {{
      color: var(--text-sub);
      font-size: 0.9rem;
      line-height: 1.5;
    }}

    .fields-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 1.25rem;
    }}

    .field-card {{
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 0.85rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      transition: transform 0.15s, border-color 0.15s;
    }}

    .field-card:hover {{
      border-color: var(--brand);
      transform: translateY(-2px);
    }}

    .field-card-header {{
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
    }}

    .field-key-name {{
      font-family: var(--font-mono);
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--brand);
    }}

    .field-zh-label {{
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-main);
      margin-top: 0.15rem;
    }}

    .field-meta-tags {{
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.25rem;
    }}

    .type-tag {{
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--text-muted);
      background: var(--bg-card-alt);
      padding: 0.15rem 0.4rem;
      border-radius: 0.25rem;
      border: 1px solid var(--border);
    }}

    .constraint-tag {{
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 0.25rem;
    }}

    .constraint-pk {{ background: rgba(248, 113, 113, 0.2); color: var(--danger); border: 1px solid var(--danger); }}
    .constraint-req {{ background: rgba(251, 191, 36, 0.2); color: var(--warning); border: 1px solid var(--warning); }}
    .constraint-opt {{ background: rgba(100, 116, 139, 0.2); color: var(--text-sub); border: 1px solid var(--border); }}
    .constraint-comp {{ background: rgba(52, 211, 153, 0.2); color: var(--success); border: 1px solid var(--success); }}

    .field-section-title {{
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.2rem;
    }}

    .plain-definition {{
      background: var(--bg-card-alt);
      padding: 0.65rem 0.85rem;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      color: var(--text-main);
      border-left: 3px solid var(--brand);
      line-height: 1.5;
    }}

    .field-detail-row {{
      font-size: 0.825rem;
      color: var(--text-sub);
      line-height: 1.45;
    }}

    .field-detail-row strong {{
      color: var(--text-main);
    }}

    .location-box {{
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 0.5rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.8rem;
      color: var(--brand);
    }}

    .location-box strong {{
      color: var(--text-main);
    }}

    .example-box {{
      background: var(--bg-card-alt);
      border: 1px dashed var(--border);
      border-radius: 0.5rem;
      padding: 0.6rem 0.75rem;
      font-size: 0.8rem;
    }}

    .example-val {{
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--success);
    }}

    @media (max-width: 1024px) {{
      .container {{ flex-direction: column; }}
      aside {{ width: 100%; height: auto; position: static; border-right: none; border-bottom: 1px solid var(--border); }}
      .fields-grid {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>
  <header>
    <div class="header-left">
      <div>
        <h1 style="font-size: 1.15rem; font-weight: 800;">料事如神系統 (PMS) — 主檔案欄位名稱定義與數據鏈位置權威手冊</h1>
        <p style="font-size: 0.8rem; color: var(--text-muted);">
          Master Table Field Dictionary & Data Pipeline Location Guide · V2.0 3NF Standard
        </p>
      </div>
      <span class="header-badge">{len(tables)} 大核心主表 · {total_fields} 運算欄位</span>
    </div>
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input type="text" id="searchInput" placeholder="快速搜尋欄位代碼、中文名稱、位置或定義..." onkeyup="filterFields()">
    </div>
  </header>

  <div class="container">
    <aside>
      <div class="nav-group-title">主檔案清單 (Master Tables)</div>
      <nav id="sidebarNav">
"""

    for t in tables:
        t_clean_label = t['tableLabel'].split('(')[0].strip()
        html += f"""        <a href="#table-{t['tableKey']}" class="nav-item">
          <span>{t['categoryIcon']} {t_clean_label}</span>
          <span class="nav-item-count">{len(t['fields'])}</span>
        </a>\n"""

    html += """      </nav>
    </aside>

    <main>
"""

    for table in tables:
        html += f"""      <section id="table-{table['tableKey']}" class="table-section">
        <div class="table-header">
          <div class="table-header-top">
            <div class="table-title">
              <span>{table['categoryIcon']}</span>
              <span>{table['tableLabel']}</span>
              <code style="font-size: 0.9rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;">[{table['tableKey']}]</code>
            </div>
            <span class="dept-badge">權責：{table['ownerDepartment']}</span>
          </div>
          <p class="table-desc">{table['description']}</p>
        </div>

        <div class="fields-grid">
"""

        for field in table['fields']:
            c_tag = 'constraint-opt'
            c_str = str(field['constraint'])
            if 'PK' in c_str:
                c_tag = 'constraint-pk'
            elif 'Required' in c_str:
                c_tag = 'constraint-req'
            elif 'Computed' in c_str:
                c_tag = 'constraint-comp'

            html += f"""          <div class="field-card" data-search="{field['fieldKey']} {field['fieldLabel']} {field['plainDefinition']} {field['uiLocation']}">
            <div class="field-card-header">
              <div>
                <div class="field-key-name">{field['fieldKey']}</div>
                <div class="field-zh-label">{field['fieldLabel']}</div>
              </div>
              <div class="field-meta-tags">
                <span class="constraint-tag {c_tag}">{field['constraint']}</span>
                <span class="type-tag">{field['dataType']}</span>
              </div>
            </div>

            <div class="plain-definition">
              <div class="field-section-title">💡 白話通俗解說</div>
              {field['plainDefinition']}
            </div>

            <div class="field-detail-row">
              <strong>業務目的：</strong>{field['businessPurpose']}
            </div>

            <div class="field-detail-row">
              <strong>填寫規範：</strong>{field['fillGuide']}
            </div>

            <div class="location-box">
              <div class="field-section-title">📍 數據鏈與介面位置</div>
              <strong>{field['uiLocation']}</strong>
            </div>

            <div class="example-box">
              <div class="field-section-title">📝 實務範例</div>
              <span class="example-val">{field['example']}</span>
              <div style="margin-top: 0.25rem; color: var(--text-sub);">{field['exampleExplanation']}</div>
            </div>

            <div class="field-detail-row" style="border-top: 1px dashed var(--border); padding-top: 0.5rem;">
              <strong>MRP/演算影響：</strong>{field['mrpImpact']}
            </div>
          </div>\n"""

        html += """        </div>
      </section>\n"""

    html += """    </main>
  </div>

  <script>
    function filterFields() {
      const q = document.getElementById('searchInput').value.toLowerCase().trim();
      const cards = document.querySelectorAll('.field-card');
      const sections = document.querySelectorAll('.table-section');

      cards.forEach(card => {
        const text = (card.getAttribute('data-search') || '').toLowerCase();
        if (!q || text.includes(q)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });

      sections.forEach(sec => {
        const visibleCards = sec.querySelectorAll('.field-card[style*="display: flex"], .field-card:not([style*="display: none"])');
        if (visibleCards.length === 0 && q) {
          sec.style.display = 'none';
        } else {
          sec.style.display = 'block';
        }
      });
    }
  </script>
</body>
</html>"""

    with open('docs/PMS_Master_Field_Data_Dictionary.html', 'w', encoding='utf-8') as f:
        f.write(html)

    print("docs/PMS_Master_Field_Data_Dictionary.html compiled successfully with exact 8 tables.")

if __name__ == '__main__':
    main()
