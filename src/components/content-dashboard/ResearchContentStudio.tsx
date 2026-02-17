'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  Clock, 
  Search, 
  FileText, 
  TrendingUp,
  Eye,
  Play,
  Download,
  RefreshCw
} from 'lucide-react'
import { ResearchPanel } from './ResearchPanel'
import { AssetCompare } from './AssetCompare'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResearchFindings {
  trending_angles: string[]
  key_statistics: Record<string, string>
  viral_hooks: string[]
  competitor_insights: string
  platform_strategy: {
    linkedin: string
    instagram: string
    email: string
    video: string
  }
  brand_voice: string
  recommended_cta: string
  research_sources: string[]
  confidence_score: number
  research_timestamp: string
}

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

interface Bundle {
  id: string
  topic: string
  trade: string
  status: string
  research_findings?: ResearchFindings
  strategy_doc?: any
  assets: ContentAsset[]
  research_progress?: {
    stage: string
    message: string
    progress_percent: number
  }
}

interface Props {
  bundleId: string
  onClose?: () => void
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ResearchContentStudio({ bundleId, onClose }: Props) {
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState('research')
  const [researchExpanded, setResearchExpanded] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<ContentAsset | null>(null)

  // Load bundle data
  useEffect(() => {
    loadBundle()
    const interval = setInterval(loadBundle, 3000) // Poll every 3 seconds
    return () => clearInterval(interval)
  }, [bundleId])

  const loadBundle = async () => {
    try {
      // Load bundle data
      const bundleResponse = await fetch(`/api/content-dashboard/bundles/${bundleId}`)
      const bundleData = await bundleResponse.json()
      
      if (!bundleData.success) {
        throw new Error(bundleData.error || 'Failed to load bundle')
      }

      // Load research data
      const researchResponse = await fetch(`/api/content-dashboard/research?bundleId=${bundleId}`)
      const researchData = await researchResponse.json()

      // Load strategy data
      const strategyResponse = await fetch(`/api/content-dashboard/strategy?bundleId=${bundleId}`)
      const strategyData = await strategyResponse.json()

      // Combine data
      const combinedBundle: Bundle = {
        ...bundleData.data.bundle,
        assets: bundleData.data.assets || [],
        research_findings: researchData.data?.research_findings,
        strategy_doc: strategyData.data?.strategy_doc,
        research_progress: researchData.data?.progress
      }

      setBundle(combinedBundle)
      setError(null)

      // Auto-select appropriate tab based on status
      if (combinedBundle.status === 'researching') {
        setSelectedTab('research')
      } else if (combinedBundle.status === 'awaiting_strategy_approval') {
        setSelectedTab('strategy')
      } else if (['creating', 'review', 'complete'].includes(combinedBundle.status)) {
        setSelectedTab('assets')
      }

    } catch (error) {
      console.error('Error loading bundle:', error)
      setError(error instanceof Error ? error.message : 'Failed to load bundle')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveStrategy = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/content-dashboard/strategy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleId,
          action: 'approve'
        })
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to approve strategy')
      }

      await loadBundle()
    } catch (error) {
      console.error('Error approving strategy:', error)
      setError(error instanceof Error ? error.message : 'Failed to approve strategy')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !bundle) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading research-first content studio...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="max-w-2xl mx-auto mt-8">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!bundle) {
    return (
      <Alert className="max-w-2xl mx-auto mt-8">
        <AlertDescription>Bundle not found</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Research-First Content Studio</h1>
          <p className="text-muted-foreground">
            {bundle.topic} • {bundle.trade} • {bundle.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={bundle.status} />
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <ProgressOverview bundle={bundle} />

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger 
            value="research"
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Research
            {bundle.research_findings && <CheckCircle className="h-4 w-4 text-green-500" />}
          </TabsTrigger>
          <TabsTrigger 
            value="strategy"
            disabled={!bundle.research_findings}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Strategy
            {bundle.strategy_doc && <CheckCircle className="h-4 w-4 text-green-500" />}
          </TabsTrigger>
          <TabsTrigger 
            value="assets"
            disabled={!bundle.strategy_doc}
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Content Assets
            {bundle.assets.length > 0 && <Badge variant="secondary">{bundle.assets.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Research Tab */}
        <TabsContent value="research" className="space-y-4">
          <ResearchPanel
            bundle={bundle}
            expanded={researchExpanded}
            onToggleExpanded={() => setResearchExpanded(!researchExpanded)}
            onReload={loadBundle}
          />
        </TabsContent>

        {/* Strategy Tab */}
        <TabsContent value="strategy" className="space-y-4">
          <StrategyPanel
            bundle={bundle}
            onApprove={handleApproveStrategy}
            onReload={loadBundle}
          />
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-4">
          <AssetsPanel
            bundle={bundle}
            onAssetSelect={setSelectedAsset}
            onReload={loadBundle}
          />
        </TabsContent>
      </Tabs>

      {/* Asset Compare Modal */}
      {selectedAsset && (
        <AssetCompare
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onRegenerate={() => {
            setSelectedAsset(null)
            loadBundle()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub Components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    researching: { label: 'Researching', color: 'blue', icon: Search },
    awaiting_strategy_approval: { label: 'Strategy Review', color: 'yellow', icon: Eye },
    creating: { label: 'Creating Content', color: 'blue', icon: Play },
    review: { label: 'Ready for Review', color: 'green', icon: CheckCircle },
    complete: { label: 'Complete', color: 'green', icon: CheckCircle },
    failed: { label: 'Failed', color: 'red', icon: Clock }
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.failed
  const Icon = config.icon

  return (
    <Badge variant={config.color === 'red' ? 'destructive' : 'default'} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

function ProgressOverview({ bundle }: { bundle: Bundle }) {
  const getProgressData = () => {
    switch (bundle.status) {
      case 'researching':
        return {
          percent: bundle.research_progress?.progress_percent || 0,
          message: bundle.research_progress?.message || 'Starting research...'
        }
      case 'awaiting_strategy_approval':
        return { percent: 50, message: 'Research complete, awaiting strategy approval' }
      case 'creating':
        return { percent: 75, message: 'Creating content based on research and strategy' }
      case 'review':
        return { percent: 90, message: 'Content ready for review' }
      case 'complete':
        return { percent: 100, message: 'All content created successfully' }
      default:
        return { percent: 0, message: 'Processing...' }
    }
  }

  const { percent, message } = getProgressData()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Progress Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={percent} className="w-full" />
        <p className="text-sm text-muted-foreground">{message}</p>
        
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${bundle.research_findings ? 'bg-green-500' : 'bg-gray-300'}`} />
            Research Complete
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${bundle.strategy_doc ? 'bg-green-500' : 'bg-gray-300'}`} />
            Strategy Approved
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${bundle.assets.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
            Content Created
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StrategyPanel({ bundle, onApprove, onReload }: { 
  bundle: Bundle
  onApprove: () => void
  onReload: () => void
}) {
  if (!bundle.research_findings) {
    return (
      <Alert>
        <AlertDescription>
          Strategy requires completed research. Please wait for research to complete.
        </AlertDescription>
      </Alert>
    )
  }

  if (!bundle.strategy_doc) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Strategy Generation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Strategy is being generated based on research findings...
          </p>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Analyzing research and creating platform strategies</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Content Strategy Document</CardTitle>
            {bundle.status === 'awaiting_strategy_approval' && (
              <Button onClick={onApprove} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Approve & Start Creation
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h4 className="font-medium mb-2">LinkedIn Strategy</h4>
              <p className="text-sm text-muted-foreground">{bundle.strategy_doc.linkedin_strategy.hook}</p>
              <p className="text-xs mt-1">Angle: {bundle.strategy_doc.linkedin_strategy.angle}</p>
            </Card>
            
            <Card className="p-4">
              <h4 className="font-medium mb-2">Instagram Strategy</h4>
              <p className="text-sm text-muted-foreground">{bundle.strategy_doc.instagram_strategy.hook}</p>
              <p className="text-xs mt-1">Visual: {bundle.strategy_doc.instagram_strategy.visual_concept}</p>
            </Card>
            
            <Card className="p-4">
              <h4 className="font-medium mb-2">Email Strategy</h4>
              <p className="text-sm text-muted-foreground">{bundle.strategy_doc.email_strategy.hook}</p>
              <p className="text-xs mt-1">Story: {bundle.strategy_doc.email_strategy.story_angle}</p>
            </Card>
            
            <Card className="p-4">
              <h4 className="font-medium mb-2">Video Strategy</h4>
              <p className="text-sm text-muted-foreground">{bundle.strategy_doc.video_strategy.hook}</p>
              <p className="text-xs mt-1">Timing: {bundle.strategy_doc.video_strategy.timing_breakdown}</p>
            </Card>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Overall Narrative</h4>
            <p className="text-sm">{bundle.strategy_doc.overall_narrative}</p>
          </div>
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Strategy Confidence: {bundle.strategy_doc.strategy_confidence}%</span>
            <span>Key Differentiators: {bundle.strategy_doc.key_differentiators?.join(', ')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AssetsPanel({ bundle, onAssetSelect, onReload }: {
  bundle: Bundle
  onAssetSelect: (asset: ContentAsset) => void
  onReload: () => void
}) {
  if (bundle.assets.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No content assets created yet. Content creation will start after strategy approval.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Content Assets</h3>
        <Button variant="outline" size="sm" onClick={onReload}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bundle.assets.map((asset) => (
          <Card key={asset.id} className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onAssetSelect(asset)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base capitalize">
                  {asset.type.replace('_', ' ')}
                </CardTitle>
                <Badge variant={asset.status === 'selected' ? 'default' : 'secondary'}>
                  {asset.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {asset.content.substring(0, 150)}...
              </p>
              
              {asset.research_influence && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Based on research: {Object.keys(asset.research_influence).join(', ')}
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">
                  Version {asset.version}
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost">
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}