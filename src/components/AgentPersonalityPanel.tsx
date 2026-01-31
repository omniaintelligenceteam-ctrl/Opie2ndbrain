'use client';

import { useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAgentPersonality } from '../contexts/AgentPersonalityContext';
import {
  PersonalityParameters,
  PersonalityPreset,
  PARAMETER_META,
  DEFAULT_PARAMETERS,
} from '../lib/personalityTypes';

type TabId = 'sliders' | 'presets' | 'abtest';

interface SliderProps {
  param: keyof PersonalityParameters;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function PersonalitySlider({ param, value, onChange, disabled }: SliderProps) {
  const { theme } = useTheme();
  const meta = PARAMETER_META[param];

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <span style={{
          fontSize: 14,
          fontWeight: 500,
          color: theme.colors.textPrimary,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span>{meta.icon}</span>
          {meta.label}
        </span>
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: theme.colors.accent,
          background: `${theme.colors.accent}15`,
          padding: '2px 8px',
          borderRadius: 4,
        }}>
          {value}
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          style={{
            width: '100%',
            height: 6,
            borderRadius: 3,
            background: `linear-gradient(to right, ${theme.colors.accent} ${value}%, ${theme.colors.bgElevated} ${value}%)`,
            appearance: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        />
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 4,
      }}>
        <span style={{ fontSize: 11, color: theme.colors.textMuted }}>{meta.lowLabel}</span>
        <span style={{ fontSize: 11, color: theme.colors.textMuted }}>{meta.highLabel}</span>
      </div>

      <p style={{
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
        marginBottom: 0,
      }}>
        {meta.description}
      </p>
    </div>
  );
}

interface PresetCardProps {
  preset: PersonalityPreset;
  isActive: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}

function PresetCard({ preset, isActive, onSelect, onDelete }: PresetCardProps) {
  const { theme } = useTheme();

  return (
    <div
      onClick={onSelect}
      style={{
        padding: 16,
        borderRadius: 12,
        background: isActive ? `${theme.colors.accent}15` : theme.colors.bgElevated,
        border: `2px solid ${isActive ? theme.colors.accent : 'transparent'}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
      }}>
        <span style={{ fontSize: 24 }}>{preset.emoji}</span>
        <div>
          <h4 style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: theme.colors.textPrimary,
          }}>
            {preset.name}
          </h4>
          {isActive && (
            <span style={{
              fontSize: 10,
              color: theme.colors.accent,
              fontWeight: 500,
            }}>
              Active
            </span>
          )}
        </div>
      </div>

      <p style={{
        margin: 0,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 12,
      }}>
        {preset.description}
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 6,
      }}>
        {Object.entries(preset.parameters).map(([key, val]) => (
          <div key={key} style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: theme.colors.textMuted,
          }}>
            <span>{PARAMETER_META[key as keyof PersonalityParameters].label}</span>
            <span style={{ fontWeight: 500, color: theme.colors.textSecondary }}>{val}</span>
          </div>
        ))}
      </div>

      {onDelete && !preset.isDefault && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: theme.colors.textMuted,
            fontSize: 16,
            padding: 4,
          }}
        >
          x
        </button>
      )}
    </div>
  );
}

export default function AgentPersonalityPanel() {
  const { theme } = useTheme();
  const {
    presets,
    activePreset,
    setActivePreset,
    createPreset,
    deletePreset,
    currentParameters,
    setCurrentParameters,
    useCustomParameters,
    setUseCustomParameters,
    abTests,
    createABTest,
    deleteABTest,
  } = useAgentPersonality();

  const [activeTab, setActiveTab] = useState<TabId>('sliders');
  const [showCreatePreset, setShowCreatePreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetEmoji, setNewPresetEmoji] = useState('🎯');
  const [newPresetDescription, setNewPresetDescription] = useState('');

  // A/B Test state
  const [abTestPrompt, setABTestPrompt] = useState('');
  const [configA, setConfigA] = useState<PersonalityParameters>({ ...DEFAULT_PARAMETERS });
  const [configB, setConfigB] = useState<PersonalityParameters>({ ...DEFAULT_PARAMETERS, creativity: 80 });

  const handleParameterChange = useCallback((param: keyof PersonalityParameters, value: number) => {
    setCurrentParameters({
      ...currentParameters,
      [param]: value,
    });
  }, [currentParameters, setCurrentParameters]);

  const handleCreatePreset = useCallback(() => {
    if (!newPresetName.trim()) return;

    createPreset({
      name: newPresetName,
      emoji: newPresetEmoji,
      description: newPresetDescription || `Custom preset: ${newPresetName}`,
      parameters: { ...currentParameters },
    });

    setNewPresetName('');
    setNewPresetEmoji('🎯');
    setNewPresetDescription('');
    setShowCreatePreset(false);
  }, [newPresetName, newPresetEmoji, newPresetDescription, currentParameters, createPreset]);

  const handleCreateABTest = useCallback(() => {
    if (!abTestPrompt.trim()) return;

    createABTest({
      name: `Test ${abTests.length + 1}`,
      configA,
      configB,
      taskPrompt: abTestPrompt,
    });

    setABTestPrompt('');
  }, [abTestPrompt, configA, configB, abTests.length, createABTest]);

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'sliders', label: 'Tune', icon: '🎚️' },
    { id: 'presets', label: 'Presets', icon: '📦' },
    { id: 'abtest', label: 'A/B Test', icon: '🧪' },
  ];

  return (
    <div style={{
      background: theme.colors.bgPrimary,
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        <h2 style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 600,
          color: theme.colors.textPrimary,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span>🎛️</span>
          Agent Personality
        </h2>
        <p style={{
          margin: '8px 0 0',
          fontSize: 13,
          color: theme.colors.textSecondary,
        }}>
          Tune how agents respond to your requests
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${theme.colors.border}`,
        padding: '0 24px',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab.id ? theme.colors.accent : 'transparent'}`,
              color: activeTab === tab.id ? theme.colors.accent : theme.colors.textSecondary,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 24 }}>
        {activeTab === 'sliders' && (
          <div>
            {/* Custom vs Preset toggle */}
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 24,
            }}>
              <button
                onClick={() => setUseCustomParameters(false)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: !useCustomParameters ? theme.colors.accent : theme.colors.bgElevated,
                  border: 'none',
                  borderRadius: 8,
                  color: !useCustomParameters ? '#fff' : theme.colors.textSecondary,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Use Preset
              </button>
              <button
                onClick={() => setUseCustomParameters(true)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: useCustomParameters ? theme.colors.accent : theme.colors.bgElevated,
                  border: 'none',
                  borderRadius: 8,
                  color: useCustomParameters ? '#fff' : theme.colors.textSecondary,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Custom
              </button>
            </div>

            {/* Active preset indicator */}
            {!useCustomParameters && activePreset && (
              <div style={{
                padding: 12,
                background: `${theme.colors.accent}10`,
                borderRadius: 8,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <span style={{ fontSize: 20 }}>{activePreset.emoji}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: theme.colors.textPrimary }}>
                    {activePreset.name}
                  </div>
                  <div style={{ fontSize: 11, color: theme.colors.textMuted }}>
                    Currently active preset
                  </div>
                </div>
              </div>
            )}

            {/* Sliders */}
            {(Object.keys(PARAMETER_META) as Array<keyof PersonalityParameters>).map(param => (
              <PersonalitySlider
                key={param}
                param={param}
                value={currentParameters[param]}
                onChange={(val) => handleParameterChange(param, val)}
                disabled={!useCustomParameters}
              />
            ))}

            {/* Save as preset button */}
            {useCustomParameters && (
              <button
                onClick={() => setShowCreatePreset(true)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: theme.colors.bgElevated,
                  border: `1px dashed ${theme.colors.border}`,
                  borderRadius: 8,
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  fontSize: 13,
                  marginTop: 16,
                }}
              >
                Save as Preset
              </button>
            )}

            {/* Create preset modal */}
            {showCreatePreset && (
              <div style={{
                marginTop: 16,
                padding: 16,
                background: theme.colors.bgElevated,
                borderRadius: 12,
                border: `1px solid ${theme.colors.border}`,
              }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, color: theme.colors.textPrimary }}>
                  Create New Preset
                </h4>
                <input
                  type="text"
                  placeholder="Preset name"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: theme.colors.bgPrimary,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: 8,
                    color: theme.colors.textPrimary,
                    fontSize: 13,
                    marginBottom: 8,
                    boxSizing: 'border-box',
                  }}
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: theme.colors.bgPrimary,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: 8,
                    color: theme.colors.textPrimary,
                    fontSize: 13,
                    marginBottom: 12,
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleCreatePreset}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: theme.colors.accent,
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowCreatePreset(false)}
                    style={{
                      padding: '10px 16px',
                      background: theme.colors.bgPrimary,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: 8,
                      color: theme.colors.textSecondary,
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'presets' && (
          <div style={{
            display: 'grid',
            gap: 12,
          }}>
            {presets.map(preset => (
              <PresetCard
                key={preset.id}
                preset={preset}
                isActive={activePreset?.id === preset.id}
                onSelect={() => setActivePreset(preset.id)}
                onDelete={preset.isDefault ? undefined : () => deletePreset(preset.id)}
              />
            ))}
          </div>
        )}

        {activeTab === 'abtest' && (
          <div>
            <p style={{
              fontSize: 13,
              color: theme.colors.textSecondary,
              marginTop: 0,
              marginBottom: 20,
            }}>
              Compare two configurations side-by-side to find what works best.
            </p>

            {/* Config A */}
            <div style={{
              padding: 16,
              background: theme.colors.bgElevated,
              borderRadius: 12,
              marginBottom: 12,
            }}>
              <h4 style={{
                margin: '0 0 12px',
                fontSize: 13,
                color: theme.colors.accent,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: theme.colors.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                }}>A</span>
                Config A
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {(Object.keys(PARAMETER_META) as Array<keyof PersonalityParameters>).map(param => (
                  <div key={param} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: theme.colors.textMuted, width: 70 }}>
                      {PARAMETER_META[param].label}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={configA[param]}
                      onChange={(e) => setConfigA({ ...configA, [param]: Number(e.target.value) })}
                      style={{
                        width: 50,
                        padding: '4px 8px',
                        background: theme.colors.bgPrimary,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: 4,
                        color: theme.colors.textPrimary,
                        fontSize: 12,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Config B */}
            <div style={{
              padding: 16,
              background: theme.colors.bgElevated,
              borderRadius: 12,
              marginBottom: 16,
            }}>
              <h4 style={{
                margin: '0 0 12px',
                fontSize: 13,
                color: '#a855f7',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#a855f7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                }}>B</span>
                Config B
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {(Object.keys(PARAMETER_META) as Array<keyof PersonalityParameters>).map(param => (
                  <div key={param} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: theme.colors.textMuted, width: 70 }}>
                      {PARAMETER_META[param].label}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={configB[param]}
                      onChange={(e) => setConfigB({ ...configB, [param]: Number(e.target.value) })}
                      style={{
                        width: 50,
                        padding: '4px 8px',
                        background: theme.colors.bgPrimary,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: 4,
                        color: theme.colors.textPrimary,
                        fontSize: 12,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Test prompt */}
            <textarea
              placeholder="Enter a test prompt to compare configs..."
              value={abTestPrompt}
              onChange={(e) => setABTestPrompt(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: theme.colors.bgElevated,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: 8,
                color: theme.colors.textPrimary,
                fontSize: 13,
                minHeight: 80,
                resize: 'vertical',
                marginBottom: 12,
                boxSizing: 'border-box',
              }}
            />

            <button
              onClick={handleCreateABTest}
              disabled={!abTestPrompt.trim()}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: abTestPrompt.trim() ? theme.colors.accent : theme.colors.bgElevated,
                border: 'none',
                borderRadius: 8,
                color: abTestPrompt.trim() ? '#fff' : theme.colors.textMuted,
                cursor: abTestPrompt.trim() ? 'pointer' : 'not-allowed',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Run A/B Test
            </button>

            {/* Previous tests */}
            {abTests.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{
                  margin: '0 0 12px',
                  fontSize: 13,
                  color: theme.colors.textSecondary,
                }}>
                  Previous Tests
                </h4>
                {abTests.slice(-5).reverse().map(test => (
                  <div
                    key={test.id}
                    style={{
                      padding: 12,
                      background: theme.colors.bgElevated,
                      borderRadius: 8,
                      marginBottom: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: theme.colors.textPrimary }}>
                        {test.taskPrompt.slice(0, 50)}...
                      </div>
                      <div style={{ fontSize: 11, color: theme.colors.textMuted }}>
                        {test.status} - {new Date(test.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteABTest(test.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: theme.colors.textMuted,
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
