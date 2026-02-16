'use client'

import { useState } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { 
  FileText,
  Video,
  Image as ImageIcon,
  Mail,
  TrendingUp
} from 'lucide-react'

interface ContentBundle {
  id: string
  topic: string
  trade?: string
  quality_score: number
  status: string
  created_at: string
}

interface ContentStudioProps {
  supabase: SupabaseClient | null
}

export default function ContentStudio({ supabase }: ContentStudioProps) {
  const [bundles, setBundles] = useState<ContentBundle[]>([])
  const [selectedBundle, setSelectedBundle] = useState<ContentBundle | null>(null)

  const assetTypes = [
    { icon: Mail, label: 'Emails', count: 0 },
    { icon: FileText, label: 'Posts', count: 0 },
    { icon: Video, label: 'Videos', count: 0 },
    { icon: ImageIcon, label: 'Images', count: 0 }
  ]

  return (
    <div className="space-y-6">
      {/* Asset Library */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {assetTypes.map((asset) => (
          <div key={asset.label} className="p-4 rounded-lg border transition-colors cursor-pointer" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <asset.icon className="w-5 h-5 text-purple-400" />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{asset.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{asset.count}</p>
          </div>
        ))}
      </div>

      {/* Recent Bundles */}
      <div className="rounded-lg border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Recent Content Bundles
        </h3>
        
        {bundles.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            <p>No content bundles yet.</p>
            <p className="text-sm mt-1">Run the content machine workflow to create your first bundle.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bundles.slice(0, 5).map((bundle) => (
              <div 
                key={bundle.id}
                onClick={() => setSelectedBundle(bundle)}
                className="p-3 rounded-lg border cursor-pointer transition-colors"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">{bundle.topic}</h4>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {bundle.trade} • Quality: {bundle.quality_score}/100
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    bundle.status === 'complete' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {bundle.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors">
          Create New Bundle
        </button>
        <button className="px-4 py-2 border rounded-lg text-sm transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          View All Assets
        </button>
      </div>
    </div>
  )
}
