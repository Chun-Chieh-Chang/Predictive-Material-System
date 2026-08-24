/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react'
import { Search, BookOpen, ChevronRight } from 'lucide-react'
import {
  GLOSSARY_ENTRIES,
  GLOSSARY_CATEGORIES,
  searchGlossary,
  type GlossaryCategory,
  type GlossaryEntry,
} from '../data/glossaryData'

const CATEGORY_COLORS: Record<GlossaryCategory, { bg: string; border: string; text: string; badge: string }> = {
  fields:  { bg: 'bg-sky-50 dark:bg-sky-950/30',     border: 'border-sky-200 dark:border-sky-800',     text: 'text-sky-700 dark:text-sky-300',     badge: 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300' },
  fk_sku:  { bg: 'bg-blue-50 dark:bg-blue-950/30',    border: 'border-blue-200 dark:border-blue-800',   text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
  mrp:     { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' },
  molding: { bg: 'bg-amber-50 dark:bg-amber-950/30',   border: 'border-amber-200 dark:border-amber-800',  text: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' },
  system:  { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' },
  process: { bg: 'bg-cyan-50 dark:bg-cyan-950/30',     border: 'border-cyan-200 dark:border-cyan-800',    text: 'text-cyan-700 dark:text-cyan-300', badge: 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300' },
  alert:   { bg: 'bg-rose-50 dark:bg-rose-950/30',     border: 'border-rose-200 dark:border-rose-800',    text: 'text-rose-700 dark:text-rose-300', badge: 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300' },
  doc:     { bg: 'bg-slate-50 dark:bg-slate-800/50',   border: 'border-slate-200 dark:border-slate-700',  text: 'text-slate-700 dark:text-slate-300', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
}

const GlossaryView: React.FC = () => {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<GlossaryCategory | 'all'>('all')

  const filtered = useMemo(() => {
    const bySearch = search.trim() ? searchGlossary(search) : GLOSSARY_ENTRIES
    return activeCategory === 'all' ? bySearch : bySearch.filter(e => e.category === activeCategory)
  }, [search, activeCategory])

  const grouped = useMemo(() => {
    if (activeCategory !== 'all') return null
    const map = new Map<GlossaryCategory, GlossaryEntry[]>()
    for (const cat of GLOSSARY_CATEGORIES) {
      const entries = filtered.filter(e => e.category === cat.id)
      if (entries.length > 0) map.set(cat.id, entries)
    }
    return map
  }, [activeCategory, filtered])

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">專業術語辭典</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {GLOSSARY_ENTRIES.length} 個術語 · {GLOSSARY_CATEGORIES.length} 大分類
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋術語、英文或說明…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              activeCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            全部 ({GLOSSARY_ENTRIES.length})
          </button>
          {GLOSSARY_CATEGORIES.map(cat => {
            const count = GLOSSARY_ENTRIES.filter(e => e.category === cat.id).length
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.icon} {cat.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Search className="w-10 h-10 mb-4 opacity-40" />
            <p className="text-sm">找不到符合「{search}」的術語</p>
            <p className="text-xs mt-1">請嘗試其他關鍵字或切換分類</p>
          </div>
        ) : activeCategory === 'all' && grouped ? (
          <div className="space-y-6 max-w-4xl">
            {Array.from(grouped.entries()).map(([catId, entries]) => {
              const catInfo = GLOSSARY_CATEGORIES.find(c => c.id === catId)!
              const colors = CATEGORY_COLORS[catId]
              return (
                <div key={catId}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {catInfo.icon} {catInfo.label}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${colors.badge}`}>
                      {entries.length} 項
                    </span>
                  </div>
                  <div className="space-y-2">
                    {entries.map(entry => (
                      <GlossaryCard key={entry.id} entry={entry} colors={colors} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2 max-w-4xl">
            {filtered.map(entry => {
              const colors = CATEGORY_COLORS[entry.category]
              return <GlossaryCard key={entry.id} entry={entry} colors={colors} />
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
        <span>按 「全部」可瀏覽完整 {GLOSSARY_ENTRIES.length} 個術語</span>
        <span>每次新增術語請同步更新 glossaryData.ts</span>
      </div>
    </div>
  )
}

interface GlossaryCardProps {
  entry: GlossaryEntry
  colors: (typeof CATEGORY_COLORS)[GlossaryCategory]
}

const GlossaryCard: React.FC<GlossaryCardProps> = ({ entry, colors }) => {
  const [expanded, setExpanded] = useState(false)
  const isField = entry.category === 'fields' || !!entry.plainDefinition

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-xl p-4 transition-all shadow-xs`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-start justify-between gap-3 cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-bold ${colors.text}`}>{entry.term}</span>
            {entry.tableLabel && (
              <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700 font-sans">
                {entry.tableLabel}
              </span>
            )}
            {entry.dataType && (
              <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                {entry.dataType}
              </span>
            )}
            {entry.en && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{entry.en}</span>
            )}
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 space-y-3">
          {/* 💡 白話通俗定義 (生活化大白話) */}
          {entry.plainDefinition ? (
            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300 mb-1">
                <span>💡 大白話解說 (這是什麼？)：</span>
              </div>
              <p className="font-sans leading-relaxed text-[13px]">{entry.plainDefinition}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-sans">{entry.definition}</p>
          )}

          {/* 🎯 業務價值 & ⚙️ MRP 運算衝擊 */}
          {(entry.businessPurpose || entry.mrpImpact) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {entry.businessPurpose && (
                <div className="p-2.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-900/50">
                  <div className="font-bold text-purple-900 dark:text-purple-300 mb-0.5">🎯 這欄位有什麼用？</div>
                  <div className="text-purple-800 dark:text-purple-300/90 leading-snug">{entry.businessPurpose}</div>
                </div>
              )}
              {entry.mrpImpact && (
                <div className="p-2.5 bg-cyan-50/70 dark:bg-cyan-950/30 rounded-lg border border-cyan-200 dark:border-cyan-900/50">
                  <div className="font-bold text-cyan-900 dark:text-cyan-300 mb-0.5">⚙️ 系統怎麼拿來算？(MRP 衝擊)</div>
                  <div className="text-cyan-800 dark:text-cyan-300/90 leading-snug">{entry.mrpImpact}</div>
                </div>
              )}
            </div>
          )}

          {/* 📝 填寫規範與防呆要點 */}
          {entry.fillGuide && (
            <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-900/50 text-xs">
              <div className="font-bold text-indigo-900 dark:text-indigo-300 mb-0.5">📝 該怎麼填？(填寫規範與要點)</div>
              <div className="text-indigo-800 dark:text-indigo-300/90 leading-snug font-sans">{entry.fillGuide}</div>
            </div>
          )}

          {/* 🔍 示範數值與詳細情境說明 */}
          {entry.example && (
            <div className="bg-white/90 dark:bg-slate-950/80 rounded-xl p-3 text-xs border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">實務示範填寫：</span>
                <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-300 font-mono font-bold border border-sky-200 dark:border-sky-800">
                  {entry.example}
                </span>
              </div>
              {entry.exampleExplanation && (
                <div className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">💡 範例詳細說明：</span>
                  {entry.exampleExplanation}
                </div>
              )}
            </div>
          )}

          {/* 關聯名詞 */}
          {entry.related && entry.related.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400">相關關聯：</span>
              {entry.related.map(r => (
                <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  ↔ {r}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export { GlossaryView }
export default GlossaryView
