'use client';
import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Clock, Hash, Sparkles, Loader2 } from 'lucide-react';

interface ModelResponse {
  model: string;
  response: string;
  timing: number; // milliseconds
  tokens: number;
  error?: string;
}

interface ModelCounselState {
  question: string;
  responses: {
    opus?: ModelResponse;
    sonnet?: ModelResponse;
    kimi?: ModelResponse;
  };
  synthesis?: string;
  isLoading: boolean;
  expandedPanels: Set<string>;
}

const MODELS = [
  { id: 'opus', name: 'Claude Opus 4.6', color: '#ff6b6b' },
  { id: 'sonnet', name: 'Claude Sonnet 4', color: '#4ecdc4' },
  { id: 'kimi', name: 'Kimi K2.5', color: '#45b7d1' }
];

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
  const [state, setState] = useState<ModelCounselState>({
    question: '',
    responses: {},
    synthesis: undefined,
    isLoading: false,
    expandedPanels: new Set(['opus', 'sonnet', 'gemini', 'synthesis'])
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
        body: JSON.stringify({ question: state.question })
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
        <p style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: '1.1rem',
          margin: 0,
          lineHeight: 1.5
        }}>
          Get perspectives from multiple AI models and find the best synthesized answer
        </p>
      </div>

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
        {MODELS.map(model => (
          <ResponseCard
            key={model.id}
            model={model.name}
            response={state.responses[model.id as keyof typeof state.responses]}
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