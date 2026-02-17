'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle, Button, Badge, Alert, AlertDescription } from '@/components/ui'
import { Progress } from '@/components/ui/Progress'
import { 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  Target,
  Lightbulb,
  Users,
  Megaphone,
  RefreshCw,
  CheckCircle,
  Search,
  ExternalLink
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types  
// ---------------------------------------------------------------------------

interface ResearchFindings {
  trending_angles: string[]
  key_statistics: Record<string, string>
  viral_hooks: string[]
  competitor_insights: string
  platform_strategy: Record<string, string>
  brand_voice: string
  recommended_cta: string
  research_sources: string[]
  confidence_score: number
  research_timestamp: string
}

interface Bundle {
  id: string
  topic: string
  trade: string
  status: string
  research_findings?: ResearchFindings
  research_progress?: {
    stage: string
    message: string
    progress_percent: number
    details?: Record<string, unknown>
  }
}

interface Props {
  bundle: Bundle
  expanded: boolean
  onToggleExpanded: () => void
  onReload: () => void
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ResearchPanel({ bundle, expanded, onToggleExpanded, onReload }: Props) {
  const [activeSection, setActiveSection] = useState<string>('summary')

  // Research in progress
  if (bundle.status === 'researching' && !bundle.research_findings) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Research in Progress
            </CardTitle>
            <Button variant="outline" size="sm" onClick={onReload}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResearchProgressView progress={bundle.research_progress} />
          
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <strong>Research-First Approach:</strong> We're conducting comprehensive market research 
              before creating any content. This includes analyzing industry trends, competitor strategies, 
              viral content patterns, and platform best practices.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Research completed
  if (!bundle.research_findings) {
    return (
      <Alert>
        <AlertDescription>
          No research findings available. Research may have failed or is still in progress.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* Research Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Research Complete
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Confidence: {bundle.research_findings.confidence_score}%
              </Badge>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onToggleExpanded}
                className="flex items-center gap-1"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {expanded ? 'Collapse' : 'Expand Details'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResearchSummary findings={bundle.research_findings} />
        </CardContent>
      </Card>

      {/* Detailed Research Findings */}
      {expanded && (
        <div className="grid gap-4">
          <ResearchDetailTabs 
            findings={bundle.research_findings}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub Components
// ---------------------------------------------------------------------------

function ResearchProgressView({ progress }: { progress?: Bundle['research_progress'] }) {
  if (!progress) {
    return (
      <div className="space-y-2">
        <Progress value={0} />
        <p className="text-sm text-muted-foreground">Starting research...</p>
      </div>
    )
  }

  const stageIcons = {
    initializing: Search,
    web_search: TrendingUp,
    competitor_scan: Users,
    brand_audit: Target,
    synthesis: Lightbulb,
    complete: CheckCircle,
    failed: RefreshCw
  }

  const Icon = stageIcons[progress.stage as keyof typeof stageIcons] || Search

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium capitalize">{progress.stage.replace('_', ' ')}</span>
      </div>
      
      <Progress value={progress.progress_percent} className="h-2" />
      
      <p className="text-sm text-muted-foreground">{progress.message}</p>

      {progress.details && (
        <div className="bg-gray-50 p-3 rounded-lg text-xs">
          <strong>Details:</strong>
          <pre className="mt-1 text-muted-foreground whitespace-pre-wrap">
            {JSON.stringify(progress.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function ResearchSummary({ findings }: { findings: ResearchFindings }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium">Trending Angles</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {findings.trending_angles.length} key angles identified
        </p>
        <p className="text-xs mt-1">{findings.trending_angles[0]}</p>
      </div>

      <div className="bg-green-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">Statistics</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {Object.keys(findings.key_statistics).length} key stats found
        </p>
        <p className="text-xs mt-1">
          {Object.entries(findings.key_statistics)[0]?.[1]?.substring(0, 40)}...
        </p>
      </div>

      <div className="bg-purple-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium">Viral Hooks</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {findings.viral_hooks.length} proven hooks
        </p>
        <p className="text-xs mt-1">{findings.viral_hooks[0]?.substring(0, 40)}...</p>
      </div>

      <div className="bg-orange-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Megaphone className="h-4 w-4 text-orange-600" />
          <span className="text-sm font-medium">Brand Voice</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Voice analysis complete
        </p>
        <p className="text-xs mt-1">{findings.brand_voice.substring(0, 40)}...</p>
      </div>
    </div>
  )
}

function ResearchDetailTabs({ 
  findings, 
  activeSection, 
  onSectionChange 
}: { 
  findings: ResearchFindings
  activeSection: string
  onSectionChange: (section: string) => void
}) {
  const sections = [
    { id: 'trends', label: 'Trending Angles', icon: TrendingUp },
    { id: 'statistics', label: 'Key Statistics', icon: Target },
    { id: 'hooks', label: 'Viral Hooks', icon: Lightbulb },
    { id: 'competitors', label: 'Competitor Analysis', icon: Users },
    { id: 'strategy', label: 'Platform Strategy', icon: Megaphone },
    { id: 'sources', label: 'Research Sources', icon: ExternalLink }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detailed Research Findings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Section Navigation */}
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <Button
              key={section.id}
              variant={activeSection === section.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSectionChange(section.id)}
              className="flex items-center gap-2"
            >
              <section.icon className="h-3 w-3" />
              {section.label}
            </Button>
          ))}
        </div>

        {/* Section Content */}
        <div className="min-h-[200px]">
          {activeSection === 'trends' && (
            <TrendingAnglesSection angles={findings.trending_angles} />
          )}
          {activeSection === 'statistics' && (
            <StatisticsSection statistics={findings.key_statistics} />
          )}
          {activeSection === 'hooks' && (
            <ViralHooksSection hooks={findings.viral_hooks} />
          )}
          {activeSection === 'competitors' && (
            <CompetitorSection insights={findings.competitor_insights} />
          )}
          {activeSection === 'strategy' && (
            <PlatformStrategySection strategy={findings.platform_strategy} />
          )}
          {activeSection === 'sources' && (
            <ResearchSourcesSection 
              sources={findings.research_sources}
              timestamp={findings.research_timestamp}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function TrendingAnglesSection({ angles }: { angles: string[] }) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium">Trending Content Angles</h4>
      <div className="grid gap-3">
        {angles.map((angle, index) => (
          <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Badge variant="secondary">{index + 1}</Badge>
            <span className="text-sm">{angle}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatisticsSection({ statistics }: { statistics: Record<string, string> }) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium">Key Industry Statistics</h4>
      <div className="grid gap-3">
        {Object.entries(statistics).map(([key, value], index) => (
          <div key={index} className="p-3 border rounded-lg">
            <h5 className="font-medium text-sm capitalize">{key.replace('_', ' ')}</h5>
            <p className="text-sm text-muted-foreground mt-1">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ViralHooksSection({ hooks }: { hooks: string[] }) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium">Proven Viral Hooks</h4>
      <div className="grid gap-3">
        {hooks.map((hook, index) => (
          <div key={index} className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <p className="text-sm font-medium">"{hook}"</p>
            <p className="text-xs text-muted-foreground mt-1">
              Emotional trigger • High engagement pattern
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function CompetitorSection({ insights }: { insights: string }) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium">Competitor Analysis</h4>
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm whitespace-pre-line">{insights}</p>
      </div>
    </div>
  )
}

function PlatformStrategySection({ strategy }: { strategy: Record<string, string> }) {
  const platformIcons = {
    linkedin: Users,
    instagram: Target,
    email: Megaphone,
    video: TrendingUp
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium">Platform-Specific Strategies</h4>
      <div className="grid gap-4">
        {Object.entries(strategy).map(([platform, approach]) => {
          const Icon = platformIcons[platform as keyof typeof platformIcons] || Target
          return (
            <Card key={platform} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4" />
                <h5 className="font-medium capitalize">{platform}</h5>
              </div>
              <p className="text-sm text-muted-foreground">{approach}</p>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function ResearchSourcesSection({ 
  sources, 
  timestamp 
}: { 
  sources: string[]
  timestamp: string 
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Research Sources</h4>
        <Badge variant="outline" className="text-xs">
          Updated: {new Date(timestamp).toLocaleString()}
        </Badge>
      </div>
      <div className="space-y-2">
        {sources.map((source, index) => (
          <div key={index} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
            <ExternalLink className="h-3 w-3" />
            <span className="text-sm">{source}</span>
          </div>
        ))}
      </div>
      {sources.length === 0 && (
        <p className="text-sm text-muted-foreground">No sources recorded</p>
      )}
    </div>
  )
}