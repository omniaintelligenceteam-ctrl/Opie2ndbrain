'use client';
import { useState } from 'react';

interface Skill {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  agents: string[];
}

const SKILLS: Skill[] = [
  // Memory
  { id: 'memory', name: 'Memory Management', emoji: '🧠', description: 'Store and retrieve context across sessions', category: 'Memory', agents: ['research', 'analyst'] },
  { id: 'context', name: 'Context Window', emoji: '📚', description: 'Manage conversation context and history', category: 'Memory', agents: ['all'] },
  { id: 'knowledge', name: 'Knowledge Base', emoji: '📖', description: 'Access structured knowledge repositories', category: 'Memory', agents: ['research', 'content'] },
  
  // Business Intel
  { id: 'web_search', name: 'Web Search', emoji: '🔍', description: 'Search the web for information', category: 'Business Intel', agents: ['research', 'analyst'] },
  { id: 'web_fetch', name: 'Web Scraping', emoji: '🌐', description: 'Extract data from web pages', category: 'Business Intel', agents: ['research', 'analyst'] },
  { id: 'market_research', name: 'Market Research', emoji: '📈', description: 'Analyze market trends and competitors', category: 'Business Intel', agents: ['analyst', 'sales'] },
  { id: 'lead_gen', name: 'Lead Generation', emoji: '🎯', description: 'Find and qualify potential customers', category: 'Business Intel', agents: ['sales', 'outreach'] },
  
  // Coding
  { id: 'coding', name: 'Code Generation', emoji: '💻', description: 'Write, refactor, and debug code', category: 'Coding', agents: ['code'] },
  { id: 'git', name: 'Git Operations', emoji: '📦', description: 'Version control and repository management', category: 'Coding', agents: ['code'] },
  { id: 'testing', name: 'Testing', emoji: '🧪', description: 'Write and run tests', category: 'Coding', agents: ['code', 'qa'] },
  { id: 'review', name: 'Code Review', emoji: '👁️', description: 'Review code for quality and best practices', category: 'Coding', agents: ['code', 'qa'] },
  
  // Sales
  { id: 'crm', name: 'CRM Integration', emoji: '📇', description: 'Manage customer relationships', category: 'Sales', agents: ['sales', 'outreach', 'success'] },
  { id: 'proposals', name: 'Proposal Writing', emoji: '📝', description: 'Generate professional proposals', category: 'Sales', agents: ['proposal', 'sales'] },
  { id: 'pricing', name: 'Pricing Strategy', emoji: '💲', description: 'Calculate and optimize pricing', category: 'Sales', agents: ['proposal', 'contractor'] },
  { id: 'negotiation', name: 'Negotiation Support', emoji: '🤝', description: 'Assist with deal negotiations', category: 'Sales', agents: ['sales'] },
  
  // Content
  { id: 'writing', name: 'Content Writing', emoji: '✍️', description: 'Create written content', category: 'Content', agents: ['content', 'proposal'] },
  { id: 'editing', name: 'Editing', emoji: '📝', description: 'Edit and refine content', category: 'Content', agents: ['content', 'qa'] },
  { id: 'seo', name: 'SEO Optimization', emoji: '🔎', description: 'Optimize content for search engines', category: 'Content', agents: ['content'] },
  { id: 'email', name: 'Email Composition', emoji: '📧', description: 'Write professional emails', category: 'Content', agents: ['outreach', 'success'] },
  
  // Design & Visual
  { id: 'design', name: 'Design Concepts', emoji: '🎨', description: 'Create visual design concepts', category: 'Design', agents: ['mockup'] },
  { id: 'visualization', name: 'Data Visualization', emoji: '📊', description: 'Create charts and visual reports', category: 'Design', agents: ['analyst', 'mockup'] },
  { id: 'branding', name: 'Branding', emoji: '🏷️', description: 'Maintain brand consistency', category: 'Design', agents: ['mockup', 'content'] },
  
  // Industry
  { id: 'industry', name: 'Industry Knowledge', emoji: '🏗️', description: 'Contractor and construction expertise', category: 'Industry', agents: ['contractor'] },
  { id: 'compliance', name: 'Compliance', emoji: '✅', description: 'Ensure regulatory compliance', category: 'Industry', agents: ['contractor', 'qa'] },
  { id: 'onboarding', name: 'Onboarding', emoji: '🚀', description: 'Customer onboarding flows', category: 'Industry', agents: ['success'] },
];

const CATEGORIES = ['All', 'Memory', 'Business Intel', 'Coding', 'Sales', 'Content', 'Design', 'Industry'];

interface SkillsPanelProps {
  onSkillSelect?: (skillId: string) => void;
}

export default function SkillsPanel({ onSkillSelect }: SkillsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const filteredSkills = SKILLS.filter(skill => {
    const matchesCategory = selectedCategory === 'All' || skill.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>⚡</span>
        <h2 style={styles.title}>Skill Catalog</h2>
        <span style={styles.badge}>{SKILLS.length} skills</span>
      </div>

      <div style={styles.controls}>
        <div style={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          <span style={styles.searchIcon}>🔍</span>
        </div>
        
        <div style={styles.categoryTabs}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                ...styles.categoryTab,
                ...(selectedCategory === cat ? styles.categoryTabActive : {}),
                ...(cat !== 'All' ? { borderLeft: `2px solid ${getCategoryColor(cat)}` } : {})
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.skillsList}>
        {filteredSkills.map(skill => {
          const isExpanded = expandedSkill === skill.id;
          return (
            <div
              key={skill.id}
              style={{
                ...styles.skillCard,
                borderLeftColor: getCategoryColor(skill.category),
              }}
              onClick={() => setExpandedSkill(isExpanded ? null : skill.id)}
            >
              <div style={styles.skillHeader}>
                <span style={styles.skillEmoji}>{skill.emoji}</span>
                <div style={styles.skillInfo}>
                  <div style={styles.skillName}>{skill.name}</div>
                  <div style={styles.skillCategory}>{skill.category}</div>
                </div>
              </div>

              {isExpanded && (
                <div style={styles.skillDetails}>
                  <p style={styles.skillDescription}>{skill.description}</p>
                  <div style={styles.agentsList}>
                    <span style={styles.agentsLabel}>Used by:</span>
                    <div style={styles.agentTags}>
                      {skill.agents.map(agent => (
                        <span key={agent} style={styles.agentTag}>
                          {agent === 'all' ? '🤖 All Agents' : agent}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredSkills.length === 0 && (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🔍</span>
            <p>No skills found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: '#1a1a2e',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '500px',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerIcon: {
    fontSize: '24px',
  },
  title: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    margin: 0,
    flex: 1,
  },
  badge: {
    background: 'rgba(34,197,94,0.2)',
    color: '#22c55e',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  controls: {
    padding: '12px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  searchWrapper: {
    position: 'relative',
    marginBottom: '12px',
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 36px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.85rem',
    outline: 'none',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '14px',
    opacity: 0.5,
  },
  categoryTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  categoryTab: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '6px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  categoryTabActive: {
    background: 'rgba(102,126,234,0.2)',
    color: '#fff',
  },
  skillsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 20px',
  },
  skillCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '8px',
    cursor: 'pointer',
    borderLeft: '3px solid',
    transition: 'all 0.2s ease',
  },
  skillHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  skillEmoji: {
    fontSize: '20px',
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  skillCategory: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.7rem',
    marginTop: '2px',
  },
  skillDetails: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  skillDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.8rem',
    lineHeight: 1.5,
    margin: '0 0 10px 0',
  },
  agentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  agentsLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.7rem',
  },
  agentTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  agentTag: {
    background: 'rgba(102,126,234,0.15)',
    color: 'rgba(255,255,255,0.8)',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.7rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'rgba(255,255,255,0.4)',
  },
  emptyIcon: {
    fontSize: '32px',
    display: 'block',
    marginBottom: '10px',
  },
};
