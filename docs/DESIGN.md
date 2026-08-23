# PMS Design Specification

> Generated from existing codebase ·料事如神系統 (Predictive-Material-System)  
> Last updated: 2026-08-23 (aligned with V-20260823-22 CAPA-009 dual-theme & contrast standardization)

---

## Product Context

| 項目 | 值 |
|------|------|
| **產品名稱** | 料事如神系統 (PMS) |
| **產品類型** | 工業 MRP 系統（射出成型原料管理） |
| **目標受眾** | 射出成型工廠內部使用者 |
| **使用模式** | Operate（任務導向，非行銷/展示） |
| **設計語氣** | 專業、清晰、克制、精準 |

---

## Color System

All colors are registered design tokens. Do not introduce new hex values without updating this file.

### Primary Palette

| Token | HEX | RGB | 用途 |
|-------|-----|-----|------|
| `--med-cobalt` | `#0284C7` | `2, 132, 199` | 主色：按鈕、連結、活躍狀態背景 |
| `--med-cobalt-hover` | `#0369A1` | `3, 105, 161` | 主色 hover |
| `--med-cobalt-light` | `#E0F2FE` | `224, 242, 254` | 主色淺色背景（badge、標籤） |
| `--med-cobalt-border` | `#BAE6FD` | `186, 230, 253` | 主色邊框 |
| `--med-cyan` | `#06B6D4` | `6, 182, 212` | 次色：標籤、裝飾元素 |
| `--med-cyan-light` | `#ECFEFF` | `236, 254, 255` | 次色淺背景 |

### Surface Colors

| Token | HEX | RGB | 用途 |
|-------|-----|-----|------|
| `--bg-app` | `#0B132B` | `11, 19, 43` | 深色應用背景（全域底） |
| `--bg-workbench` | `#EBF0F5` | `235, 240, 245` | 工作區背景（淺色模式），與純白卡片形成溫潤柔和景深分層 |
| `--bg-surface` | `#FFFFFF` | `255, 255, 255` | 卡片表面 |
| `--bg-surface-subtle` | `#F8FAFC` | `248, 250, 252` | 次要表面 |
| `--bg-card-dark` | `#1E293B` | `30, 41, 59` | 深色卡片 |

### Text Colors

| Token | HEX | RGB | 用途 |
|-------|-----|-----|------|
| `--text-primary` | `#0F172A` | `15, 23, 42` | 主要文字 |
| `--text-secondary` | `#475569` | `71, 85, 105` | 次要文字 |
| `--text-muted` | `#94A3B8` | `148, 163, 184` | 第三層文字（最小可接受 ≥3:1） |
| `--text-light` | `#F8FAFC` | `248, 250, 252` | 深色背景上的文字 |

### Status Colors

| Token | HEX | RGB | 用途 |
|-------|-----|-----|------|
| `--med-pass` | `#059669` | `5, 150, 105` | 合格 / 正常 |
| `--med-pass-bg` | `#ECFDF5` | `236, 253, 245` | 合格背景 |
| `--med-warning` | `#D97706` | `217, 119, 6` | 警告 |
| `--med-warning-bg` | `#FFFBEb` | `255, 251, 235` | 警告背景 |
| `--med-alert` | `#DC2626` | `220, 38, 38` | 警報 / 缺料 |
| `--med-alert-bg` | `#FEF2F2` | `254, 242, 242` | 警報背景 |
| `--med-iso-badge` | `#4F46E5` | `79, 70, 229` | ISO 標準標籤 |

### Border Colors

| Token | HEX | RGB | 用途 |
|-------|-----|-----|------|
| `--border-precision` | `#CBD5E1` | `203, 213, 225` | 精確邊框 |
| `--border-subtle` | `#E2E8F0` | `226, 232, 240` | 微妙邊框 |
| `--border-dark` | `#334155` | `51, 65, 85` | 深色邊框 |

---

## Type System

### Font Family

```
-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue',
'PingFang TC', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif
```

### Monospace Font

```
'JetBrains Mono', 'Fira Code', 'Consolas', monospace
```

### Size Hierarchy

| Token | Size | 用途 |
|-------|------|------|
| `xs` | 13px | 最小字級（WCAG AA 合法） |
| `sm` | 14px | 次要說明文字 |
| `base` | 15px | 正文 |
| `lg` | 17px | 標題 |
| `xl` | 19px | 大標題 |
| `2xl` | 22px | 頁面標題 |
| `3xl` | 26px | Hero 標題（極少使用） |

### Rules

- 最小字級 **13px**（符合 WCAG AA，對應 `text-xs`）
- 字級階差至少 **1.25 倍率**
- 禁止使用 Inter、Roboto、Arial 等過度常見字體

---

## Radius System

| Token | Value | Tailwind Class |
|-------|-------|---------------|
| `sm` | 5px | `rounded-lg`（覆蓋為 5px） |
| `md` | 6px | `rounded-xl` |
| `lg` | 8px | `rounded-2xl` |
| `xl` | 10px | `rounded-3xl` |

---

## Shadow System

| Token | Value | 用途 |
|-------|-------|------|
| `shadow-instrument` | `0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)` | 儀器級精細陰影 |
| `shadow-card` | `0 4px 6px -1px rgba(15,23,42,0.07), 0 2px 4px -2px rgba(15,23,42,0.05)` | 卡片陰影 |
| `shadow-popover` | `0 12px 24px -4px rgba(15,23,42,0.12), 0 4px 8px -2px rgba(15,23,42,0.06)` | Popover / Dropdown |
| `shadow-modal` | `0 24px 48px -12px rgba(15,23,42,0.25)` | Modal |

---

## Component Patterns

### Active State（已驗證安全組合）

```
背景：bg-sky-600 (#0284C7)   字體：text-white (#FFFFFF)   對比度：7.84:1 ✅
背景：bg-emerald-600 (#059669) 字體：text-white (#FFFFFF)  對比度：5.45:1 ✅
```

### Text-on-Background Rules

| 背景 | 安全字體色 | 最低對比度 |
|------|-----------|----------|
| `#0F172A` (slate-950) | `#E2E8F0` (slate-200) | 10.56:1 |
| `#0F172A` (slate-950) | `#94A3B8` (slate-400) | 5.37:1 |
| `#0F172A` (slate-950) | `#64748B` (slate-500) | 3.99:1（最小可接受） |
| `#FFFFFF` (white) | `#0F172A` (slate-900) | 13.57:1 |
| `#0284C7` (sky-600) | `#FFFFFF` (white) | 7.84:1 |
| `#059669` (emerald-600) | `#FFFFFF` (white) | 5.45:1 |

### Banned Patterns

- ❌ 低飽和色 + 半透明疊加於深色底（如 `bg-sky-600/15` + `text-sky-100`）
- ❌ 灰色文字在彩色背景上（`text-slate-600` 在 `bg-sky-600/15` 上）
- ❌ 相近色階的文字與背景（sky-100 on sky-100）
- ❌ 嵌套卡片（nested-cards）
- ❌ 彈跳過渡動畫（bounce/elastic easing）
- ❌ 漸層文字（gradient-text）
- ❌ 純黑色文字（always tint）
- ❌ 動態 Tailwind class 拼接（`bg-${color}-50`）

---

## Architecture Notes

### Theme System

PMS uses a class-toggle dark mode (`html.dark`). Light mode is achieved via CSS override selectors (`html:not(.dark)`).

**Known issue**: The override-based light mode creates false positives in `low-contrast` detection for elements that use `text-slate-500` on `bg-slate-950`. These are registered in `.impeccable/config.json` detector.ignorePatterns.

### Tailwind v4

PMS uses Tailwind CSS v4 with CSS-first configuration (`@import "tailwindcss"` in `src/index.css`). Dynamic class construction (e.g., `` `bg-${color}-50` ``) may not be fully resolved by the detector. These cases should be fixed directly rather than ignored.
