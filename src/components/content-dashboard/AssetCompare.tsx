'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  X, 
  RefreshCw, 
  ArrowRight,
  Copy,
  Download,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContentAsset {
  id: string
  type: string
  content: string
  status: 'generated' | 'selected' | 'regenerating' | 'dropped' | 'archived'
  research_influence?: Record<string, string>
  metadata?: Record<string, unknown>
  version: number
  created_at: string
}

interface RegenerationOptions {
  angle?: 'professional' | 'casual' | 'urgent' | 'educational' | 'conversational'
  length?: 'shorter' | 'longer' | 'same'
  tone?: string
  focus?: string
  style?: string
  customInstructions?: string
}

interface Props {
  asset: ContentAsset
  onClose: () => void
  onRegenerate: () => void
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AssetCompare({ asset, onClose, onRegenerate }: Props) {
  const [regeneratingAsset, setRegeneratingAsset] = useState<ContentAsset | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regenerationOptions, setRegenerationOptions] = useState<RegenerationOptions>({
    angle: 'professional',
    length: 'same',
    tone: '',
    focus: '',
    style: '',
    customInstructions: ''
  })

  // Load regenerating asset if one exists
  useEffect(() => {
    checkForRegeneratingAsset()
    
    // Poll for completion if regenerating
    if (isRegenerating) {
      const interval = setInterval(checkForRegeneratingAsset, 2000)
      return () => clearInterval(interval)
    }
  }, [asset.id, isRegenerating])

  const checkForRegeneratingAsset = async () => {
    try {
      const response = await fetch(`/api/content-dashboard/assets?bundleId=${asset.bundle_id}&type=${asset.type}&status=regenerating`)
      const data = await response.json()
      
      if (data.success && data.data.assets.length > 0) {
        const regenAsset = data.data.assets[0]
        setRegeneratingAsset(regenAsset)
        setIsRegenerating(regenAsset.status === 'regenerating')
      } else {
        setIsRegenerating(false)
      }
    } catch (error) {
      console.error('Error checking for regenerating asset:', error)
    }
  }

  const handleRegenerate = async () => {
    try {
      setIsRegenerating(true)
      
      const response = await fetch(`/api/content-dashboard/assets/${asset.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          options: regenerationOptions
        })
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to regenerate asset')
      }

      // Start polling for completion
      checkForRegeneratingAsset()

    } catch (error) {
      console.error('Error regenerating asset:', error)
      setIsRegenerating(false)
    }
  }

  const handleKeepVersion = async (assetId: string, version: 'current' | 'new') => {
    try {
      const selectedId = version === 'current' ? asset.id : regeneratingAsset?.id
      const archivedId = version === 'current' ? regeneratingAsset?.id : asset.id

      // Update asset statuses
      await fetch(`/api/content-dashboard/assets/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'selected' })
      })

      if (archivedId) {
        await fetch(`/api/content-dashboard/assets/${archivedId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'archived' })
        })
      }

      onRegenerate()
      onClose()

    } catch (error) {
      console.error('Error keeping version:', error)
    }
  }

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const downloadAsset = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold capitalize">
              {asset.type.replace('_', ' ')} Asset
            </h2>
            <p className="text-sm text-muted-foreground">
              Version {asset.version} • Created {new Date(asset.created_at).toLocaleDateString()}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Current Version */}
          <div className="w-1/2 p-6 border-r overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Current Version</h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(asset.content)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadAsset(asset.content, `${asset.type}_v${asset.version}.txt`)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="whitespace-pre-wrap text-sm font-mono">
                    {asset.content}
                  </div>
                </CardContent>
              </Card>

              {/* Research Influence */}
              {asset.research_influence && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Research Influence</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    {Object.entries(asset.research_influence).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <span className="font-medium">{key}:</span> {value}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right Panel - Regeneration */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Regeneration</h3>

              {/* Regeneration Options */}
              {!isRegenerating && !regeneratingAsset && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Regeneration Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="angle">Angle</Label>
                        <Select 
                          value={regenerationOptions.angle} 
                          onValueChange={(value) => setRegenerationOptions({
                            ...regenerationOptions, 
                            angle: value as RegenerationOptions['angle']
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="educational">Educational</SelectItem>
                            <SelectItem value="conversational">Conversational</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="length">Length</Label>
                        <Select 
                          value={regenerationOptions.length} 
                          onValueChange={(value) => setRegenerationOptions({
                            ...regenerationOptions, 
                            length: value as RegenerationOptions['length']
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="shorter">Shorter</SelectItem>
                            <SelectItem value="same">Same Length</SelectItem>
                            <SelectItem value="longer">Longer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="focus">Focus Area</Label>
                      <Select 
                        value={regenerationOptions.focus} 
                        onValueChange={(value) => setRegenerationOptions({
                          ...regenerationOptions, 
                          focus: value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select focus area" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="benefits">Benefits & Value</SelectItem>
                          <SelectItem value="pain">Pain Points</SelectItem>
                          <SelectItem value="fomo">Fear of Missing Out</SelectItem>
                          <SelectItem value="social_proof">Social Proof</SelectItem>
                          <SelectItem value="urgency">Urgency</SelectItem>
                          <SelectItem value="education">Educational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="customInstructions">Custom Instructions</Label>
                      <Textarea
                        placeholder="Specific instructions for regeneration..."
                        value={regenerationOptions.customInstructions}
                        onChange={(e) => setRegenerationOptions({
                          ...regenerationOptions,
                          customInstructions: e.target.value
                        })}
                        rows={3}
                      />
                    </div>

                    <Button onClick={handleRegenerate} className="w-full">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate Asset
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Regeneration in Progress */}
              {isRegenerating && !regeneratingAsset?.content && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-sm">Regenerating asset with new options...</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      This may take 30-60 seconds
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* New Version Ready */}
              {regeneratingAsset && regeneratingAsset.content && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-green-600">New Version Ready</h4>
                    <Badge variant="outline">Version {regeneratingAsset.version}</Badge>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <div className="whitespace-pre-wrap text-sm font-mono">
                        {regeneratingAsset.content}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Comparison Actions */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => handleKeepVersion('current', 'current')}
                      className="flex-1"
                    >
                      Keep Current
                    </Button>
                    <Button 
                      onClick={() => handleKeepVersion('new', 'new')}
                      className="flex-1"
                    >
                      Keep New Version
                    </Button>
                  </div>

                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={handleRegenerate}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Again
                  </Button>
                </div>
              )}

              {/* Asset Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Asset Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div><span className="font-medium">Type:</span> {asset.type}</div>
                  <div><span className="font-medium">Status:</span> {asset.status}</div>
                  <div><span className="font-medium">Bundle:</span> {asset.bundle_id}</div>
                  <div><span className="font-medium">Created:</span> {new Date(asset.created_at).toLocaleString()}</div>
                  {asset.metadata?.session_id && (
                    <div><span className="font-medium">Session:</span> {asset.metadata.session_id}</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Research-driven content with {Object.keys(asset.research_influence || {}).length} research influences
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}