'use client';
import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Clock, Hash, Sparkles, Loader2, Settings } from 'lucide-react';

interface ModelResponse {
  model: string;
  response: string;
  timing: number; // milliseconds
  tokens: number;
  error?: string;
}

interface ModelConfig {
  id: string;
  name: string;
  color: string;
  modelId: string;
  provider: 'anthropic' | 'ollama';
}

interface ModelCounselState {
  question: string;
  responses: {
    [key: string]: ModelResponse | undefined;
  };
  synthesis?: string;
  isLoading: boolean;
  expandedPanels: Set<string>;
}

// Available models to choose from
const AVAILABLE_MODELS: ModelConfig[] = [
  { id: 'opus46', name: 'Claude Opus 4.6', color: '#c084fc', modelId: 'claude-opus-4-6-20251022', provider: 'anthropic' },
  { id: 'sonnet4', name: 'Claude Sonnet 4', color: '#4ecdc4', modelId: 'claude-sonnet-4-20250514', provider: 'anthropic' },
  { id: 'sonnet5', name: 'Claude Sonnet 5', color: '#22d3ee', modelId: 'claude-sonnet-5-20260203', provider: 'anthropic' },
  { id: 'opus45', name: 'Claude Opus 4.5', color: '#a78bfa', modelId: 'claude-opus-4-5', provider: 'anthropic' },
  { id: 'haiku', name: 'Claude Haiku 3.5', color: '#fb923c', modelId: 'claude-3-5-haiku-latest', provider: 'anthropic' },
  { id: 'kimi', name: 'Kimi K2.5', color: '#38bdf8', modelId: 'kimi-k2.5:cloud', provider: 'ollama' },
];

// Default active models (indices into AVAILABLE_MODELS)
const DEFAULT_MODELS = ['opus46', 'sonnet4', 'kimi'];

export default function ModelCounsel() {
  // CSS-in-JS for responsive styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        .model-counsel-container {
          padding: 16px !important;
        }
        .model-responses-grid {
          grid-template-columns: 1fr !important;
          gap: 16px !important;
        }
      }
      @media (min-width: 769px) and (max-width: 1024px) {
        .model-counsel-container {
          padding: 24px !important;
        }
        .model-responses-grid {
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [activeModelIds, setActiveModelIds] = useState<string[]>(DEFAULT_MODELS);
  const [showSettings, setShowSettings] = useState(false);
  const activeModels = AVAILABLE_MODELS.filter(m => activeModelIds.includes(m.id));

  const [state, setState] = useState<ModelCounselState>({
    question: '',
    responses: {},
    synthesis: undefined,
    isLoading: false,
    expandedPanels: new Set([...DEFAULT_MODELS, 'synthesis'])
  });

  const togglePanel = useCallback((panelId: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedPanels);
      if (newExpanded.has(panelId)) {
        newExpanded.delete(panelId);
      } else {
        newExpanded.add(panelId);
      }
      return { ...prev, expandedPanels: newExpanded };
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!state.question.trim() || state.isLoading) return;

    setState(prev => ({ ...prev, isLoading: true, responses: {}, synthesis: undefined }));

    try {
      const response = await fetch('/api/model-counsel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: state.question,
          models: activeModels.map(m => ({
            id: m.id,
            name: m.name,
            modelId: m.modelId,
            provider: m.provider
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        responses: data.responses,
        synthesis: data.synthesis,
        isLoading: false
      }));
    } catch (error) {
      console.error('Model Counsel error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.question, state.isLoading]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const formatTiming = (ms: number) => `${ms}ms`;
  const formatTokens = (tokens: number) => `${tokens.toLocaleString()} tokens`;

  const ResponseCard = ({ 
    model, 
    response, 
    panelId, 
    color 
  }: { 
    model: string; 
    response?: ModelResponse; 
    panelId: string; 
    color: string; 
  }) => {
    const isExpanded = state.expandedPanels.has(panelId);
    const isLoading = state.isLoading && !response;
    
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          transition: 'all 0.2s ease'
        }}
      >
        <button
          onClick={() => togglePanel(panelId)}
          style={{
            width: '100%',
            padding: '16px 20px',
            background: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.08)' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: color,
                flexShrink: 0
              }}
            />
            <span style={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>
              {model}
            </span>
            {isLoading && <Loader2 size={16} style={{ color: '#666', animation: 'spin 1s linear infinite' }} />}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {response && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#888', fontSize: '0.85rem' }}>
                  <Clock size={14} />
                  {formatTiming(response.timing)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#888', fontSize: '0.85rem' }}>
                  <Hash size={14} />
                  {formatTokens(response.tokens)}
                </div>
              </>
            )}
            {isExpanded ? <ChevronUp size={20} color="#888" /> : <ChevronDown size={20} color="#888" />}
          </div>
        </button>

        {isExpanded && (
          <div style={{ padding: '20px' }}>
            {response?.error ? (
              <div style={{ 
                color: '#ff6b6b', 
                backgroundColor: 'rgba(255,107,107,0.1)', 
                padding: '12px', 
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}>
                Error: {response.error}
              </div>
            ) : response?.response ? (
              <div style={{ 
                color: 'rgba(255,255,255,0.9)', 
                lineHeight: 1.6,
                fontSize: '0.95rem'
              }}>
                {response.response}
              </div>
            ) : isLoading ? (
              <div style={{ 
                color: '#888', 
                fontStyle: 'italic',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Thinking...
              </div>
            ) : (
              <div style={{ color: '#666', fontStyle: 'italic' }}>
                No response yet
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const SynthesisCard = () => {
    const isExpanded = state.expandedPanels.has('synthesis');
    const isLoading = state.isLoading && !state.synthesis;
    
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(99,102,241,0.05) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(139,92,246,0.2)',
          overflow: 'hidden'
        }}
      >
        <button
          onClick={() => togglePanel('synthesis')}
          style={{
            width: '100%',
            padding: '16px 20px',
            background: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            borderBottom: isExpanded ? '1px solid rgba(139,92,246,0.2)' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sparkles size={16} style={{ color: '#a855f7' }} />
            <span style={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>
              Best Answer (Synthesis)
            </span>
            {isLoading && <Loader2 size={16} style={{ color: '#666', animation: 'spin 1s linear infinite' }} />}
          </div>
          {isExpanded ? <ChevronUp size={20} color="#888" /> : <ChevronDown size={20} color="#888" />}
        </button>

        {isExpanded && (
          <div style={{ padding: '20px' }}>
            {state.synthesis ? (
              <div style={{ 
                color: 'rgba(255,255,255,0.95)', 
                lineHeight: 1.6,
                fontSize: '0.95rem'
              }}>
                {state.synthesis}
              </div>
            ) : isLoading ? (
              <div style={{ 
                color: '#888', 
                fontStyle: 'italic',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Synthesizing responses...
              </div>
            ) : (
              <div style={{ color: '#666', fontStyle: 'italic' }}>
                Ask a question to see the synthesized best answer
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ 
      padding: '32px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
    }} 
    className="model-counsel-container"
    >
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{
            color: '#fff',
            fontSize: '2rem',
            fontWeight: 700,
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            🎯 Model Counsel
          </h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: showSettings ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: showSettings ? '#a855f7' : '#888',
              fontSize: '0.85rem',
              transition: 'all 0.2s ease'
            }}
          >
            <Settings size={16} />
            Models
          </button>
        </div>
        <p style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: '1.1rem',
          margin: 0,
          lineHeight: 1.5
        }}>
          Get perspectives from multiple AI models and find the best synthesized answer
        </p>
      </div>

      {/* Model Settings Panel */}
      {showSettings && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
            Select 2-4 models to compare. Click to toggle.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {AVAILABLE_MODELS.map(model => {
              const isActive = activeModelIds.includes(model.id);
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    if (isActive && activeModelIds.length <= 2) return; // Min 2 models
                    setActiveModelIds(prev =>
                      isActive ? prev.filter(id => id !== model.id) : [...prev, model.id].slice(0, 4)
                    );
                  }}
                  style={{
                    background: isActive ? `${model.color}20` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isActive ? model.color : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: isActive ? '#fff' : '#666',
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.2s ease',
                    opacity: !isActive && activeModelIds.length >= 4 ? 0.4 : 1
                  }}
                >
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: isActive ? model.color : '#444'
                  }} />
                  {model.name}
                  <span style={{ color: '#555', fontSize: '0.75rem' }}>
                    {model.provider}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Question Input */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '24px',
        marginBottom: '32px'
      }}>
        <label style={{
          color: 'rgba(255,255,255,0.8)',
          fontSize: '0.95rem',
          fontWeight: 500,
          display: 'block',
          marginBottom: '12px'
        }}>
          Your Question
        </label>
        <textarea
          value={state.question}
          onChange={(e) => setState(prev => ({ ...prev, question: e.target.value }))}
          onKeyDown={handleKeyDown}
          placeholder="Ask something challenging that would benefit from multiple AI perspectives..."
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '1rem',
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: 1.5
          }}
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '16px'
        }}>
          <span style={{ 
            color: 'rgba(255,255,255,0.5)', 
            fontSize: '0.85rem' 
          }}>
            Press Cmd+Enter to submit
          </span>
          <button
            onClick={handleSubmit}
            disabled={!state.question.trim() || state.isLoading}
            style={{
              background: state.isLoading ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: state.isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              opacity: !state.question.trim() ? 0.5 : 1
            }}
          >
            {state.isLoading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {state.isLoading ? 'Processing...' : 'Ask All Models'}
          </button>
        </div>
      </div>

      {/* Response Cards */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}
        className="model-responses-grid"
      >
        {activeModels.map(model => (
          <ResponseCard
            key={model.id}
            model={model.name}
            response={state.responses[model.id]}
            panelId={model.id}
            color={model.color}
          />
        ))}
      </div>

      {/* Synthesis Card */}
      <SynthesisCard />

      {/* Footer */}
      {(Object.keys(state.responses).length > 0 || state.synthesis) && (
        <div style={{
          marginTop: '32px',
          padding: '16px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.9rem'
        }}>
          Model responses are generated independently and then synthesized for the best answer
        </div>
      )}
    </div>
  );
}