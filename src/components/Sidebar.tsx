'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, Lightbulb, MessageSquare, Rocket, Sparkles, Search, ChevronRight, ChevronDown, FileText, Brain, Clock, LayoutDashboard, Radio } from 'lucide-react'
import { Category, Document } from '../lib/documents'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  journals: <Calendar size={16} />, concepts: <Lightbulb size={16} />, conversations: <MessageSquare size={16} />, projects: <Rocket size={16} />, insights: <Sparkles size={16} />, memory: <Brain size={16} />, crons: <Clock size={16} />,
}

interface SidebarProps {
  categories: Category[]; documents: Document[]; recentJournals: Document[]; selectedDoc: Document | null
  onSelectDoc: (doc: Document) => void; searchQuery: string; onSearchChange: (query: string) => void
}

export default function Sidebar({ categories, documents, recentJournals, selectedDoc, onSelectDoc, searchQuery, onSearchChange }: SidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['journals']))
  const toggleCategory = (slug: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(slug)) newExpanded.delete(slug)
    else newExpanded.add(slug)
    setExpandedCategories(newExpanded)
  }
  const getDocsByCategory = (category: string) => documents.filter(d => d.category === category)
  const filteredDocs = searchQuery ? documents.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()) || d.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))) : null

return (
    <aside className="sidebar">
      <div className="sidebar-header"><Brain size={24} /><span>2nd Brain</span></div>
      <div className="sidebar-search"><div className="search-wrapper"><Search /><input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="search-input" /></div></div>
      {filteredDocs && <div className="search-results"><div className="search-results-count">{filteredDocs.length} results</div><div className="search-results-list">{filteredDocs.map(doc => <button key={`${doc.category}-${doc.slug}`} onClick={() => { onSelectDoc(doc); onSearchChange('') }} className="sidebar-item"><FileText size={16} /><span>{doc.title}</span></button>)}</div></div>}
      {!searchQuery && recentJournals.length > 0 && <div className="sidebar-section"><div className="sidebar-section-title">Recent Journals</div>{recentJournals.slice(0, 5).map(doc => <button key={doc.slug} onClick={() => onSelectDoc(doc)} className={`sidebar-item ${selectedDoc?.slug === doc.slug ? 'active' : ''}`}><Calendar size={16} style={{ color: 'var(--text-muted)' }} /><span>{doc.title}</span></button>)}</div>}
      {!searchQuery && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Dashboard</div>
          <Link href="/" className="sidebar-item"><LayoutDashboard size={16} style={{ color: 'var(--text-muted)' }} /><span>Main Dashboard</span></Link>
          <Link href="/content-command-center" className="sidebar-item"><Radio size={16} style={{ color: 'var(--text-muted)' }} /><span>Content Command Center</span></Link>
        </div>
      )}
      <nav className="sidebar-nav">
        <div className="sidebar-section-title">Categories</div>
        {categories.map(category => (
          <div key={category.slug} className="sidebar-category">
            <button onClick={() => toggleCategory(category.slug)} className="sidebar-item category-header">
              <div className="category-info">{CATEGORY_ICONS[category.slug]}<span>{category.name}</span></div>
              <div className="category-meta"><span className="category-count">{category.count}</span>{expandedCategories.has(category.slug) ? <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}</div>
            </button>
            {expandedCategories.has(category.slug) && <div className="category-children">{getDocsByCategory(category.slug).map(doc => <button key={doc.slug} onClick={() => onSelectDoc(doc)} className={`sidebar-item ${selectedDoc?.slug === doc.slug ? 'active' : ''}`}><FileText size={12} /><span>{doc.title}</span></button>)}{getDocsByCategory(category.slug).length === 0 && <div className="empty-state">No documents yet</div>}</div>}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">{documents.length} documents</div>
    </aside>
  )
}
