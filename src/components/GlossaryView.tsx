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

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-xl p-4 transition-all`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-start justify-between gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-bold ${colors.text}`}>{entry.term}</span>
            {entry.en && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{entry.en}</span>
            )}
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 space-y-2.5">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{entry.definition}</p>
          {entry.example && (
            <div className="bg-white/70 dark:bg-slate-950/50 rounded-lg px-3 py-2 text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed">
              <span className="font-semibold text-slate-500 dark:text-slate-500">範例：</span>{entry.example}
            </div>
          )}
          {entry.related && entry.related.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
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
