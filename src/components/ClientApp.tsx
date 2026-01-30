'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import DocumentViewer from './DocumentViewer'
import { Document, Category } from '../lib/documents'

interface ClientAppProps {
  initialDocuments: Document[]
  categories: Category[]
  recentJournals: Document[]
}

export default function ClientApp({ initialDocuments, categories, recentJournals }: ClientAppProps) {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
        searchInput?.focus()
      }
      if (e.key === 'Escape') setSearchQuery('')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="app-container">
      <Sidebar categories={categories} documents={initialDocuments} recentJournals={recentJournals} selectedDoc={selectedDoc} onSelectDoc={setSelectedDoc} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <DocumentViewer document={selectedDoc} />
    </div>
  )
}
