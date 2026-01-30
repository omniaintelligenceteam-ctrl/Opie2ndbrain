'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { format } from 'date-fns'
import { Calendar, Clock, Tag, Folder } from 'lucide-react'
import { Document } from '../lib/documents'

export default function DocumentViewer({ document }: { document: Document | null }) {
  if (!document) {
    return (
      <main className="main-content">
        <div className="welcome-screen">
          <div>
            <div className="welcome-emoji">🧠</div>
            <h2 className="welcome-title">Welcome to your 2nd Brain</h2>
            <p className="welcome-subtitle">Select a document from the sidebar to get started</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="main-content">
      <article className="document-view">
        <header className="document-header">
          <h1 className="document-title">{document.title}</h1>
          <div className="document-meta">
            <div className="document-meta-item"><Folder size={16} /><span style={{ textTransform: 'capitalize' }}>{document.category}</span></div>
            {document.date && <div className="document-meta-item"><Calendar size={16} /><span>{format(new Date(document.date), 'MMMM d, yyyy')}</span></div>}
            <div className="document-meta-item"><Clock size={16} /><span>Updated {format(new Date(document.modifiedAt), 'MMM d, yyyy')}</span></div>
          </div>
          {document.tags.length > 0 && (
            <div className="document-tags">
              <Tag size={16} style={{ color: 'var(--text-muted)' }} />
              {document.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
            </div>
          )}
        </header>
        <hr className="document-divider" />
        <div className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.content}</ReactMarkdown>
        </div>
      </article>
    </main>
  )
}
