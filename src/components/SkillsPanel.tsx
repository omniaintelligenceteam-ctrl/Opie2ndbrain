'use client';
import { useState } from 'react';

interface Skill {
  id: string;
  name: string;
  emoji: string;
  description: string;
  fullDescription: string;
  category: string;
  level: 'core' | 'advanced' | 'specialist';
  tags: string[];
  agents: string[];
  dependencies: string[];
  filePath: string;
  examples: string[];
}

const SKILLS: Skill[] = [
  // Memory
  { 
    id: 'memory', 
    name: 'Memory Management', 
    emoji: '🧠', 
    description: 'Store and retrieve context across sessions',
    fullDescription: 'Manages persistent memory storage for agents. Enables storing conversation context, learned preferences, and important facts that persist across sessions. Uses structured memory files and semantic search for retrieval.',
    category: 'Memory', 
    level: 'core',
    tags: ['persistence', 'context', 'retrieval', 'storage'],
    agents: ['research', 'analyst'],
    dependencies: [],
    filePath: 'skills/memory/SKILL.md',
    examples: ['Remember user preferences', 'Recall previous conversations', 'Store learned facts']
  },
  { 
    id: 'context', 
    name: 'Context Window', 
    emoji: '📚', 
    description: 'Manage conversation context and history',
    fullDescription: 'Handles the active conversation context window. Manages what information is kept in scope during a conversation, summarizes long contexts, and ensures relevant history is available.',
    category: 'Memory', 
    level: 'core',
    tags: ['conversation', 'history', 'summarization'],
    agents: ['all'],
    dependencies: ['memory'],
    filePath: 'skills/context/SKILL.md',
    examples: ['Summarize long conversations', 'Track conversation topics', 'Maintain context coherence']
  },
  { 
    id: 'knowledge', 
    name: 'Knowledge Base', 
    emoji: '📖', 
    description: 'Access structured knowledge repositories',
    fullDescription: 'Provides access to curated knowledge bases and documentation. Enables semantic search over documents, retrieves relevant information, and maintains up-to-date knowledge repositories.',
    category: 'Memory', 
    level: 'advanced',
    tags: ['documents', 'search', 'retrieval', 'rag'],
    agents: ['research', 'content'],
    dependencies: ['memory', 'context'],
    filePath: 'skills/knowledge/SKILL.md',
    examples: ['Search documentation', 'Retrieve product info', 'Access company knowledge']
  },
  
  // Business Intel
  { 
    id: 'web_search', 
    name: 'Web Search', 
    emoji: '🔍', 
    description: 'Search the web for information',
    fullDescription: 'Performs web searches using the Brave Search API. Supports region-specific searches, freshness filters, and returns structured results with titles, URLs, and snippets.',
    category: 'Business Intel', 
    level: 'core',
    tags: ['search', 'research', 'web', 'brave'],
    agents: ['research', 'analyst'],
    dependencies: [],
    filePath: 'skills/web_search/SKILL.md',
    examples: ['Search competitor websites', 'Find industry news', 'Research market trends']
  },
  { 
    id: 'web_fetch', 
    name: 'Web Scraping', 
    emoji: '🌐', 
    description: 'Extract data from web pages',
    fullDescription: 'Fetches and extracts readable content from URLs. Converts HTML to markdown, handles dynamic content, and supports various extraction modes for different content types.',
    category: 'Business Intel', 
    level: 'core',
    tags: ['scraping', 'extraction', 'html', 'markdown'],
    agents: ['research', 'analyst'],
    dependencies: ['web_search'],
    filePath: 'skills/web_fetch/SKILL.md',
    examples: ['Extract article content', 'Scrape product pages', 'Gather competitor data']
  },
  { 
    id: 'market_research', 
    name: 'Market Research', 
    emoji: '📈', 
    description: 'Analyze market trends and competitors',
    fullDescription: 'Comprehensive market research capabilities including competitor analysis, trend identification, pricing research, and market sizing. Combines multiple data sources for insights.',
    category: 'Business Intel', 
    level: 'advanced',
    tags: ['competitors', 'trends', 'analysis', 'market'],
    agents: ['analyst', 'sales'],
    dependencies: ['web_search', 'web_fetch', 'analysis'],
    filePath: 'skills/market_research/SKILL.md',
    examples: ['Analyze competitor pricing', 'Identify market trends', 'Research new markets']
  },
  { 
    id: 'lead_gen', 
    name: 'Lead Generation', 
    emoji: '🎯', 
    description: 'Find and qualify potential customers',
    fullDescription: 'Generates and qualifies leads from various sources. Uses web scraping, data enrichment, and qualification criteria to build targeted prospect lists.',
    category: 'Business Intel', 
    level: 'advanced',
    tags: ['leads', 'prospecting', 'qualification', 'sales'],
    agents: ['sales', 'outreach'],
    dependencies: ['web_search', 'web_fetch', 'crm'],
    filePath: 'skills/lead_gen/SKILL.md',
    examples: ['Build prospect lists', 'Qualify inbound leads', 'Research decision makers']
  },
  
  // Coding
  { 
    id: 'coding', 
    name: 'Code Generation', 
    emoji: '💻', 
    description: 'Write, refactor, and debug code',
    fullDescription: 'Full-stack code generation capabilities. Writes clean, maintainable code in multiple languages. Includes refactoring, debugging, and optimization. Follows best practices and coding standards.',
    category: 'Coding', 
    level: 'core',
    tags: ['development', 'programming', 'debugging', 'refactoring'],
    agents: ['code'],
    dependencies: [],
    filePath: 'skills/coding/SKILL.md',
    examples: ['Write React components', 'Debug API issues', 'Refactor legacy code']
  },
  { 
    id: 'git', 
    name: 'Git Operations', 
    emoji: '📦', 
    description: 'Version control and repository management',
    fullDescription: 'Git version control operations including commits, branches, merges, and pull requests. Manages repository state, resolves conflicts, and maintains clean git history.',
    category: 'Coding', 
    level: 'core',
    tags: ['version-control', 'commits', 'branches', 'github'],
    agents: ['code'],
    dependencies: ['coding'],
    filePath: 'skills/git/SKILL.md',
    examples: ['Create feature branches', 'Write commit messages', 'Manage pull requests']
  },
  { 
    id: 'testing', 
    name: 'Testing', 
    emoji: '🧪', 
    description: 'Write and run tests',
    fullDescription: 'Test development and execution. Writes unit tests, integration tests, and end-to-end tests. Supports multiple testing frameworks and ensures code quality through comprehensive test coverage.',
    category: 'Coding', 
    level: 'advanced',
    tags: ['unit-tests', 'integration', 'e2e', 'tdd'],
    agents: ['code', 'qa'],
    dependencies: ['coding'],
    filePath: 'skills/testing/SKILL.md',
    examples: ['Write unit tests', 'Create test fixtures', 'Run test suites']
  },
  { 
    id: 'review', 
    name: 'Code Review', 
    emoji: '👁️', 
    description: 'Review code for quality and best practices',
    fullDescription: 'Comprehensive code review capabilities. Checks for bugs, security issues, performance problems, and style violations. Provides actionable feedback and improvement suggestions.',
    category: 'Coding', 
    level: 'advanced',
    tags: ['review', 'quality', 'security', 'best-practices'],
    agents: ['code', 'qa'],
    dependencies: ['coding', 'testing'],
    filePath: 'skills/review/SKILL.md',
    examples: ['Review pull requests', 'Audit code security', 'Check coding standards']
  },
  
  // Sales
  { 
    id: 'crm', 
    name: 'CRM Integration', 
    emoji: '📇', 
    description: 'Manage customer relationships',
    fullDescription: 'Integrates with CRM systems to manage contacts, deals, and activities. Tracks customer interactions, updates records, and maintains relationship data.',
    category: 'Sales', 
    level: 'core',
    tags: ['salesforce', 'hubspot', 'contacts', 'deals'],
    agents: ['sales', 'outreach', 'success'],
    dependencies: [],
    filePath: 'skills/crm/SKILL.md',
    examples: ['Update contact records', 'Track deal progress', 'Log activities']
  },
  { 
    id: 'proposals', 
    name: 'Proposal Writing', 
    emoji: '📝', 
    description: 'Generate professional proposals',
    fullDescription: 'Creates professional sales proposals and quotes. Customizes templates, calculates pricing, and generates polished documents ready for client presentation.',
    category: 'Sales', 
    level: 'advanced',
    tags: ['quotes', 'pricing', 'documents', 'sales'],
    agents: ['proposal', 'sales'],
    dependencies: ['writing', 'templates'],
    filePath: 'skills/proposals/SKILL.md',
    examples: ['Generate project quotes', 'Create SOWs', 'Build proposal decks']
  },
  { 
    id: 'pricing', 
    name: 'Pricing Strategy', 
    emoji: '💲', 
    description: 'Calculate and optimize pricing',
    fullDescription: 'Pricing calculation and optimization. Analyzes costs, margins, and market rates to recommend optimal pricing strategies. Supports various pricing models.',
    category: 'Sales', 
    level: 'specialist',
    tags: ['pricing', 'margins', 'optimization', 'strategy'],
    agents: ['proposal', 'contractor'],
    dependencies: ['analysis'],
    filePath: 'skills/pricing/SKILL.md',
    examples: ['Calculate project costs', 'Optimize margins', 'Set competitive prices']
  },
  
  // Content
  { 
    id: 'writing', 
    name: 'Content Writing', 
    emoji: '✍️', 
    description: 'Create written content',
    fullDescription: 'Professional content writing for various formats and audiences. Adapts tone, style, and structure to match brand voice and target audience preferences.',
    category: 'Content', 
    level: 'core',
    tags: ['copywriting', 'blogs', 'articles', 'marketing'],
    agents: ['content', 'proposal'],
    dependencies: [],
    filePath: 'skills/writing/SKILL.md',
    examples: ['Write blog posts', 'Create ad copy', 'Draft press releases']
  },
  { 
    id: 'editing', 
    name: 'Editing', 
    emoji: '📝', 
    description: 'Edit and refine content',
    fullDescription: 'Professional editing for clarity, grammar, style, and tone. Improves readability, fixes errors, and polishes content for publication.',
    category: 'Content', 
    level: 'core',
    tags: ['proofreading', 'grammar', 'style', 'clarity'],
    agents: ['content', 'qa'],
    dependencies: ['writing'],
    filePath: 'skills/editing/SKILL.md',
    examples: ['Proofread documents', 'Improve clarity', 'Fix grammar issues']
  },
  { 
    id: 'seo', 
    name: 'SEO Optimization', 
    emoji: '🔎', 
    description: 'Optimize content for search engines',
    fullDescription: 'Search engine optimization for content. Keyword research, meta optimization, content structure, and technical SEO recommendations.',
    category: 'Content', 
    level: 'advanced',
    tags: ['keywords', 'meta', 'rankings', 'search'],
    agents: ['content'],
    dependencies: ['writing', 'web_search'],
    filePath: 'skills/seo/SKILL.md',
    examples: ['Optimize for keywords', 'Improve meta descriptions', 'Structure content for SEO']
  },
  { 
    id: 'email', 
    name: 'Email Composition', 
    emoji: '📧', 
    description: 'Write professional emails',
    fullDescription: 'Professional email writing for various purposes. Sales outreach, follow-ups, customer communication, and internal messaging. Personalizes content for recipients.',
    category: 'Content', 
    level: 'core',
    tags: ['outreach', 'follow-up', 'communication', 'personalization'],
    agents: ['outreach', 'success'],
    dependencies: ['writing'],
    filePath: 'skills/email/SKILL.md',
    examples: ['Write cold emails', 'Create follow-up sequences', 'Draft customer replies']
  },
  
  // Design
  { 
    id: 'design', 
    name: 'Design Concepts', 
    emoji: '🎨', 
    description: 'Create visual design concepts',
    fullDescription: 'Visual design ideation and concept creation. Generates design directions, layout suggestions, and visual concepts for various media.',
    category: 'Design', 
    level: 'specialist',
    tags: ['visual', 'creative', 'layouts', 'concepts'],
    agents: ['mockup'],
    dependencies: [],
    filePath: 'skills/design/SKILL.md',
    examples: ['Create mood boards', 'Design layouts', 'Develop visual concepts']
  },
  { 
    id: 'visualization', 
    name: 'Data Visualization', 
    emoji: '📊', 
    description: 'Create charts and visual reports',
    fullDescription: 'Data visualization and chart creation. Transforms data into clear, insightful visualizations. Supports various chart types and dashboard layouts.',
    category: 'Design', 
    level: 'advanced',
    tags: ['charts', 'graphs', 'dashboards', 'reports'],
    agents: ['analyst', 'mockup'],
    dependencies: ['analysis'],
    filePath: 'skills/visualization/SKILL.md',
    examples: ['Create sales dashboards', 'Build data reports', 'Design infographics']
  },
  
  // Industry
  { 
    id: 'industry', 
    name: 'Industry Knowledge', 
    emoji: '🏗️', 
    description: 'Contractor and construction expertise',
    fullDescription: 'Deep knowledge of contractor and construction industry. Includes licensing requirements, insurance, permits, regulations, and industry best practices.',
    category: 'Industry', 
    level: 'specialist',
    tags: ['contractors', 'construction', 'licensing', 'trades'],
    agents: ['contractor'],
    dependencies: [],
    filePath: 'skills/industry/SKILL.md',
    examples: ['Check license requirements', 'Verify insurance', 'Understand permit process']
  },
  { 
    id: 'compliance', 
    name: 'Compliance', 
    emoji: '✅', 
    description: 'Ensure regulatory compliance',
    fullDescription: 'Regulatory compliance checking and guidance. Ensures content, processes, and operations meet relevant regulatory requirements.',
    category: 'Industry', 
    level: 'specialist',
    tags: ['regulations', 'legal', 'standards', 'audit'],
    agents: ['contractor', 'qa'],
    dependencies: ['industry'],
    filePath: 'skills/compliance/SKILL.md',
    examples: ['Audit compliance', 'Check regulations', 'Ensure standards']
  },
  { 
    id: 'onboarding', 
    name: 'Onboarding', 
    emoji: '🚀', 
    description: 'Customer onboarding flows',
    fullDescription: 'Customer onboarding process management. Creates welcome sequences, guides new users, and ensures successful product adoption.',
    category: 'Industry', 
    level: 'advanced',
    tags: ['welcome', 'training', 'adoption', 'success'],
    agents: ['success'],
    dependencies: ['email', 'crm'],
    filePath: 'skills/onboarding/SKILL.md',
    examples: ['Create welcome sequences', 'Build training guides', 'Track adoption']
  },
];

const CATEGORIES = ['All', 'Memory', 'Business Intel', 'Coding', 'Sales', 'Content', 'Design', 'Industry'];

export default function SkillsPanel() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [filterLevel, setFilterLevel] = useState<string | null>(null);

  const filteredSkills = SKILLS.filter(skill => {
    const matchesCategory = selectedCategory === 'All' || skill.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesLevel = !filterLevel || skill.level === filterLevel;
    return matchesCategory && matchesSearch && matchesLevel;
  });

  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      'Memory': '#22c55e',
      'Business Intel': '#3b82f6',
      'Coding': '#667eea',
      'Sales': '#f59e0b',
      'Content': '#ec4899',
      'Design': '#8b5cf6',
      'Industry': '#14b8a6',
    };
    return colors[category] || '#667eea';
  };

  const getLevelColor = (level: string): string => {
    switch (level) {
      case 'core': return '#22c55e';
      case 'advanced': return '#667eea';
      case 'specialist': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getLevelLabel = (level: string): string => {
    switch (level) {
      case 'core': return 'Core • Essential';
      case 'advanced': return 'Advanced • Power User';
      case 'specialist': return 'Specialist • Expert';
      default: return level;
    }
  };

  // Detail View
  if (selectedSkill) {
    const skill = selectedSkill;
    return (
      <div style={styles.container}>
        <button onClick={() => setSelectedSkill(null)} style={styles.backButton}>
          ← Back to Skills
        </button>

        {/* Skill Header */}
        <div style={styles.detailHeader}>
          <div style={styles.skillIcon}>
            <span style={styles.skillEmoji}>{skill.emoji}</span>
          </div>
          <div style={styles.skillHeaderInfo}>
            <h2 style={styles.skillName}>{skill.name}</h2>
            <div style={styles.skillMeta}>
              <span style={{
                ...styles.categoryBadge,
                background: `${getCategoryColor(skill.category)}20`,
                color: getCategoryColor(skill.category),
              }}>
                {skill.category}
              </span>
              <span style={{
                ...styles.levelBadge,
                background: `${getLevelColor(skill.level)}20`,
                color: getLevelColor(skill.level),
              }}>
                {getLevelLabel(skill.level)}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={styles.detailSection}>
          <h3 style={styles.sectionTitle}>📋 Description</h3>
          <p style={styles.descriptionText}>{skill.fullDescription}</p>
        </div>

        {/* Tags */}
        <div style={styles.detailSection}>
          <h3 style={styles.sectionTitle}>🏷️ Tags</h3>
          <div style={styles.tagsList}>
            {skill.tags.map(tag => (
              <span key={tag} style={styles.tag}>#{tag}</span>
            ))}
          </div>
        </div>

        {/* Agents */}
        <div style={styles.detailSection}>
          <h3 style={styles.sectionTitle}>🤖 Used By Agents</h3>
          <div style={styles.agentsList}>
            {skill.agents.map(agent => (
              <span key={agent} style={styles.agentChip}>
                {agent === 'all' ? '🤖 All Agents' : agent}
              </span>
            ))}
          </div>
        </div>

        {/* Dependencies */}
        <div style={styles.detailSection}>
          <h3 style={styles.sectionTitle}>🔗 Dependencies</h3>
          {skill.dependencies.length > 0 ? (
            <div style={styles.depsList}>
              {skill.dependencies.map(dep => (
                <span key={dep} style={styles.depChip}>
                  {SKILLS.find(s => s.id === dep)?.emoji} {dep}
                </span>
              ))}
            </div>
          ) : (
            <p style={styles.noDeps}>No dependencies - standalone skill</p>
          )}
        </div>

        {/* Examples */}
        <div style={styles.detailSection}>
          <h3 style={styles.sectionTitle}>💡 Examples</h3>
          <ul style={styles.examplesList}>
            {skill.examples.map((ex, i) => (
              <li key={i} style={styles.exampleItem}>{ex}</li>
            ))}
          </ul>
        </div>

        {/* File Path */}
        <div style={styles.detailSection}>
          <h3 style={styles.sectionTitle}>📁 Source</h3>
          <div style={styles.filePathBox}>
            <code style={styles.filePath}>{skill.filePath}</code>
            <button style={styles.viewSourceBtn}>View Source →</button>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>🛠️</span>
          <div>
            <h2 style={styles.title}>Skill Catalog</h2>
            <span style={styles.subtitle}>{SKILLS.length} skills available</span>
          </div>
        </div>
      </div>

      <div style={styles.controls}>
        {/* Search */}
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        
        {/* Level Filters */}
        <div style={styles.levelFilters}>
          <button
            onClick={() => setFilterLevel(null)}
            style={{ ...styles.levelBtn, ...(filterLevel === null ? styles.levelBtnActive : {}) }}
          >
            All Levels
          </button>
          <button
            onClick={() => setFilterLevel('core')}
            style={{ ...styles.levelBtn, ...(filterLevel === 'core' ? styles.levelBtnActive : {}), borderColor: '#22c55e' }}
          >
            Core
          </button>
          <button
            onClick={() => setFilterLevel('advanced')}
            style={{ ...styles.levelBtn, ...(filterLevel === 'advanced' ? styles.levelBtnActive : {}), borderColor: '#667eea' }}
          >
            Advanced
          </button>
          <button
            onClick={() => setFilterLevel('specialist')}
            style={{ ...styles.levelBtn, ...(filterLevel === 'specialist' ? styles.levelBtnActive : {}), borderColor: '#f59e0b' }}
          >
            Specialist
          </button>
        </div>
        
        {/* Category Tabs */}
        <div style={styles.categoryTabs}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                ...styles.categoryTab,
                ...(selectedCategory === cat ? styles.categoryTabActive : {}),
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.skillsList}>
        {filteredSkills.map(skill => (
          <div
            key={skill.id}
            onClick={() => setSelectedSkill(skill)}
            style={{
              ...styles.skillCard,
              borderLeftColor: getCategoryColor(skill.category),
            }}
          >
            <div style={styles.skillCardHeader}>
              <span style={styles.skillCardEmoji}>{skill.emoji}</span>
              <div style={styles.skillCardInfo}>
                <div style={styles.skillCardName}>{skill.name}</div>
                <div style={styles.skillCardCategory}>{skill.category}</div>
              </div>
              <span style={{
                ...styles.levelIndicator,
                background: `${getLevelColor(skill.level)}20`,
                color: getLevelColor(skill.level),
              }}>
                {skill.level}
              </span>
            </div>
            <p style={styles.skillCardDesc}>{skill.description}</p>
            <div style={styles.skillCardFooter}>
              <div style={styles.skillCardTags}>
                {skill.tags.slice(0, 3).map(tag => (
                  <span key={tag} style={styles.skillCardTag}>#{tag}</span>
                ))}
              </div>
              <span style={styles.agentCount}>
                🤖 {skill.agents.length === 1 && skill.agents[0] === 'all' ? 'All' : skill.agents.length}
              </span>
            </div>
          </div>
        ))}

        {filteredSkills.length === 0 && (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🔍</span>
            <p>No skills match your search</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: '#1a1a2e',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  headerIcon: {
    fontSize: '28px',
  },
  title: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 600,
    margin: 0,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8rem',
  },
  controls: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  searchWrapper: {
    position: 'relative',
    marginBottom: '12px',
  },
  searchInput: {
    width: '100%',
    padding: '12px 12px 12px 40px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '14px',
    opacity: 0.5,
  },
  levelFilters: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  levelBtn: {
    padding: '6px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  levelBtnActive: {
    background: 'rgba(102,126,234,0.2)',
    color: '#fff',
    borderColor: '#667eea',
  },
  categoryTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  categoryTab: {
    padding: '6px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  categoryTabActive: {
    background: 'rgba(102,126,234,0.2)',
    color: '#fff',
  },
  skillsList: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '500px',
    overflowY: 'auto',
  },
  skillCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    borderLeft: '3px solid',
    transition: 'all 0.2s ease',
  },
  skillCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '10px',
  },
  skillCardEmoji: {
    fontSize: '24px',
  },
  skillCardInfo: {
    flex: 1,
  },
  skillCardName: {
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
  },
  skillCardCategory: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.75rem',
  },
  levelIndicator: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  skillCardDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.85rem',
    margin: '0 0 12px 0',
    lineHeight: 1.4,
  },
  skillCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillCardTags: {
    display: 'flex',
    gap: '6px',
  },
  skillCardTag: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.7rem',
  },
  agentCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: 'rgba(255,255,255,0.4)',
  },
  emptyIcon: {
    fontSize: '32px',
    display: 'block',
    marginBottom: '10px',
  },

  // Back Button
  backButton: {
    margin: '16px 16px 0',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },

  // Detail View
  detailHeader: {
    padding: '24px',
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  skillIcon: {
    width: '72px',
    height: '72px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillEmoji: {
    fontSize: '40px',
  },
  skillHeaderInfo: {
    flex: 1,
  },
  skillName: {
    color: '#fff',
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: '0 0 10px 0',
  },
  skillMeta: {
    display: 'flex',
    gap: '10px',
  },
  categoryBadge: {
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  levelBadge: {
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  detailSection: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
    margin: '0 0 12px 0',
  },
  descriptionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.95rem',
    margin: 0,
    lineHeight: 1.6,
  },
  tagsList: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  tag: {
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.7)',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.85rem',
  },
  agentsList: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  agentChip: {
    background: 'rgba(102,126,234,0.2)',
    color: '#667eea',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  depsList: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  depChip: {
    background: 'rgba(245,158,11,0.15)',
    color: '#f59e0b',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  noDeps: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.9rem',
    margin: 0,
    fontStyle: 'italic',
  },
  examplesList: {
    margin: 0,
    padding: '0 0 0 20px',
    listStyle: 'none',
  },
  exampleItem: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.9rem',
    marginBottom: '8px',
    position: 'relative',
  },
  filePathBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(0,0,0,0.3)',
    padding: '12px 16px',
    borderRadius: '10px',
  },
  filePath: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.85rem',
    fontFamily: 'monospace',
  },
  viewSourceBtn: {
    background: 'rgba(102,126,234,0.2)',
    border: 'none',
    borderRadius: '8px',
    color: '#667eea',
    padding: '8px 16px',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
