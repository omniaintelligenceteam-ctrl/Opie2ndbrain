'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  PersonalityParameters,
  PersonalityPreset,
  AgentPersonalityConfig,
  ABTestConfig,
  DEFAULT_PARAMETERS,
  DEFAULT_PRESETS,
} from '../lib/personalityTypes';

interface AgentPersonalityContextType {
  // Presets
  presets: PersonalityPreset[];
  activePreset: PersonalityPreset | null;
  setActivePreset: (presetId: string | null) => void;
  createPreset: (preset: Omit<PersonalityPreset, 'id' | 'createdAt'>) => PersonalityPreset;
  updatePreset: (id: string, updates: Partial<PersonalityPreset>) => void;
  deletePreset: (id: string) => void;

  // Current parameters (either from preset or custom)
  currentParameters: PersonalityParameters;
  setCurrentParameters: (params: PersonalityParameters) => void;
  useCustomParameters: boolean;
  setUseCustomParameters: (useCustom: boolean) => void;

  // Per-agent configs
  agentConfigs: Record<string, AgentPersonalityConfig>;
  setAgentConfig: (agentId: string, config: Partial<AgentPersonalityConfig>) => void;
  getAgentParameters: (agentId: string) => PersonalityParameters;

  // A/B Testing
  abTests: ABTestConfig[];
  createABTest: (config: Omit<ABTestConfig, 'id' | 'createdAt' | 'status'>) => string;
  updateABTest: (id: string, updates: Partial<ABTestConfig>) => void;
  deleteABTest: (id: string) => void;
}

const AgentPersonalityContext = createContext<AgentPersonalityContextType | undefined>(undefined);

// localStorage keys
const PRESETS_KEY = 'opie-personality-presets';
const ACTIVE_PRESET_KEY = 'opie-active-preset';
const CUSTOM_PARAMS_KEY = 'opie-custom-personality';
const AGENT_CONFIGS_KEY = 'opie-agent-personality-configs';
const AB_TESTS_KEY = 'opie-ab-tests';
const USE_CUSTOM_KEY = 'opie-use-custom-personality';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function AgentPersonalityProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [presets, setPresets] = useState<PersonalityPreset[]>(DEFAULT_PRESETS);
  const [activePresetId, setActivePresetId] = useState<string | null>('research-mode');
  const [customParameters, setCustomParameters] = useState<PersonalityParameters>(DEFAULT_PARAMETERS);
  const [useCustomParameters, setUseCustomParametersState] = useState(false);
  const [agentConfigs, setAgentConfigs] = useState<Record<string, AgentPersonalityConfig>>({});
  const [abTests, setABTests] = useState<ABTestConfig[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      // Load presets (merge with defaults)
      const savedPresets = localStorage.getItem(PRESETS_KEY);
      if (savedPresets) {
        const parsed = JSON.parse(savedPresets) as PersonalityPreset[];
        // Keep default presets and add user presets
        const userPresets = parsed.filter(p => !p.isDefault);
        setPresets([...DEFAULT_PRESETS, ...userPresets]);
      }

      // Load active preset
      const savedActivePreset = localStorage.getItem(ACTIVE_PRESET_KEY);
      if (savedActivePreset) {
        setActivePresetId(savedActivePreset);
      }

      // Load custom parameters
      const savedCustom = localStorage.getItem(CUSTOM_PARAMS_KEY);
      if (savedCustom) {
        setCustomParameters(JSON.parse(savedCustom));
      }

      // Load use custom flag
      const savedUseCustom = localStorage.getItem(USE_CUSTOM_KEY);
      if (savedUseCustom) {
        setUseCustomParametersState(savedUseCustom === 'true');
      }

      // Load agent configs
      const savedAgentConfigs = localStorage.getItem(AGENT_CONFIGS_KEY);
      if (savedAgentConfigs) {
        setAgentConfigs(JSON.parse(savedAgentConfigs));
      }

      // Load A/B tests
      const savedABTests = localStorage.getItem(AB_TESTS_KEY);
      if (savedABTests) {
        setABTests(JSON.parse(savedABTests));
      }
    } catch (e) {
      console.error('Failed to load personality settings:', e);
    }

    setMounted(true);
  }, []);

  // Persist presets
  useEffect(() => {
    if (mounted) {
      const userPresets = presets.filter(p => !p.isDefault);
      localStorage.setItem(PRESETS_KEY, JSON.stringify(userPresets));
    }
  }, [presets, mounted]);

  // Persist active preset
  useEffect(() => {
    if (mounted) {
      if (activePresetId) {
        localStorage.setItem(ACTIVE_PRESET_KEY, activePresetId);
      } else {
        localStorage.removeItem(ACTIVE_PRESET_KEY);
      }
    }
  }, [activePresetId, mounted]);

  // Persist custom parameters
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(CUSTOM_PARAMS_KEY, JSON.stringify(customParameters));
    }
  }, [customParameters, mounted]);

  // Persist use custom flag
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(USE_CUSTOM_KEY, String(useCustomParameters));
    }
  }, [useCustomParameters, mounted]);

  // Persist agent configs
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(AGENT_CONFIGS_KEY, JSON.stringify(agentConfigs));
    }
  }, [agentConfigs, mounted]);

  // Persist A/B tests
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(AB_TESTS_KEY, JSON.stringify(abTests));
    }
  }, [abTests, mounted]);

  // Get active preset object
  const activePreset = activePresetId
    ? presets.find(p => p.id === activePresetId) || null
    : null;

  // Get current effective parameters
  const currentParameters = useCustomParameters
    ? customParameters
    : (activePreset?.parameters || DEFAULT_PARAMETERS);

  // Preset CRUD operations
  const createPreset = useCallback((preset: Omit<PersonalityPreset, 'id' | 'createdAt'>): PersonalityPreset => {
    const newPreset: PersonalityPreset = {
      ...preset,
      id: generateId(),
      createdAt: new Date().toISOString(),
      isDefault: false,
    };
    setPresets(prev => [...prev, newPreset]);
    return newPreset;
  }, []);

  const updatePreset = useCallback((id: string, updates: Partial<PersonalityPreset>) => {
    setPresets(prev => prev.map(p => {
      if (p.id === id && !p.isDefault) {
        return { ...p, ...updates };
      }
      return p;
    }));
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets(prev => prev.filter(p => p.id !== id || p.isDefault));
    if (activePresetId === id) {
      setActivePresetId(null);
    }
  }, [activePresetId]);

  // Set active preset
  const setActivePreset = useCallback((presetId: string | null) => {
    setActivePresetId(presetId);
    if (presetId) {
      setUseCustomParametersState(false);
    }
  }, []);

  // Set use custom parameters
  const setUseCustomParameters = useCallback((useCustom: boolean) => {
    setUseCustomParametersState(useCustom);
    if (useCustom) {
      setActivePresetId(null);
    }
  }, []);

  // Set current parameters (updates custom parameters)
  const setCurrentParameters = useCallback((params: PersonalityParameters) => {
    setCustomParameters(params);
    setUseCustomParametersState(true);
  }, []);

  // Agent-specific config
  const setAgentConfig = useCallback((agentId: string, config: Partial<AgentPersonalityConfig>) => {
    setAgentConfigs(prev => {
      const existingConfig = prev[agentId] || {
        agentId,
        activePresetId: null,
        customParameters: DEFAULT_PARAMETERS,
        useCustom: false,
      };
      return {
        ...prev,
        [agentId]: {
          ...existingConfig,
          ...config,
          agentId, // Always ensure agentId is correct
        },
      };
    });
  }, []);

  const getAgentParameters = useCallback((agentId: string): PersonalityParameters => {
    const config = agentConfigs[agentId];
    if (!config) return currentParameters;

    if (config.useCustom) {
      return config.customParameters;
    }

    if (config.activePresetId) {
      const preset = presets.find(p => p.id === config.activePresetId);
      if (preset) return preset.parameters;
    }

    return currentParameters;
  }, [agentConfigs, presets, currentParameters]);

  // A/B Testing
  const createABTest = useCallback((config: Omit<ABTestConfig, 'id' | 'createdAt' | 'status'>): string => {
    const id = generateId();
    const newTest: ABTestConfig = {
      ...config,
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setABTests(prev => [...prev, newTest]);
    return id;
  }, []);

  const updateABTest = useCallback((id: string, updates: Partial<ABTestConfig>) => {
    setABTests(prev => prev.map(t =>
      t.id === id ? { ...t, ...updates } : t
    ));
  }, []);

  const deleteABTest = useCallback((id: string) => {
    setABTests(prev => prev.filter(t => t.id !== id));
  }, []);

  // Prevent flash during hydration
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <AgentPersonalityContext.Provider
      value={{
        presets,
        activePreset,
        setActivePreset,
        createPreset,
        updatePreset,
        deletePreset,
        currentParameters,
        setCurrentParameters,
        useCustomParameters,
        setUseCustomParameters,
        agentConfigs,
        setAgentConfig,
        getAgentParameters,
        abTests,
        createABTest,
        updateABTest,
        deleteABTest,
      }}
    >
      {children}
    </AgentPersonalityContext.Provider>
  );
}

export function useAgentPersonality() {
  const context = useContext(AgentPersonalityContext);
  if (!context) {
    // Return safe defaults for SSR or when provider is missing
    return {
      presets: DEFAULT_PRESETS,
      activePreset: DEFAULT_PRESETS[0],
      setActivePreset: () => {},
      createPreset: () => DEFAULT_PRESETS[0],
      updatePreset: () => {},
      deletePreset: () => {},
      currentParameters: DEFAULT_PARAMETERS,
      setCurrentParameters: () => {},
      useCustomParameters: false,
      setUseCustomParameters: () => {},
      agentConfigs: {},
      setAgentConfig: () => {},
      getAgentParameters: () => DEFAULT_PARAMETERS,
      abTests: [],
      createABTest: () => '',
      updateABTest: () => {},
      deleteABTest: () => {},
    };
  }
  return context;
}
