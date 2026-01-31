// Agent Personality & Behavior Tuning Types

export interface PersonalityParameters {
  creativity: number;      // 0-100, maps to temperature (0-1.5)
  verbosity: number;       // 0-100, controls max tokens (500-4000)
  formality: number;       // 0-100, formal vs casual tone
  riskTolerance: number;   // 0-100, conservative vs experimental
}

export interface PersonalityPreset {
  id: string;
  name: string;
  description: string;
  emoji: string;
  parameters: PersonalityParameters;
  agentId?: string;        // Optional: agent-specific preset
  isDefault?: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export interface AgentPersonalityConfig {
  agentId: string;
  activePresetId: string | null;
  customParameters: PersonalityParameters;
  useCustom: boolean;
}

export interface ABTestConfig {
  id: string;
  name: string;
  configA: PersonalityParameters;
  configB: PersonalityParameters;
  taskPrompt: string;
  status: 'pending' | 'running' | 'complete';
  results?: {
    configA: { response: string; tokens: number; duration: number };
    configB: { response: string; tokens: number; duration: number };
  };
  createdAt: string;
}

// Default personality values
export const DEFAULT_PARAMETERS: PersonalityParameters = {
  creativity: 50,
  verbosity: 50,
  formality: 50,
  riskTolerance: 50,
};

// Built-in presets
export const DEFAULT_PRESETS: PersonalityPreset[] = [
  {
    id: 'research-mode',
    name: 'Research Mode',
    description: 'Thorough, detailed analysis with comprehensive citations',
    emoji: '🔬',
    parameters: { creativity: 30, verbosity: 80, formality: 70, riskTolerance: 20 },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'quick-draft',
    name: 'Quick Draft',
    description: 'Fast, concise outputs for rapid iteration',
    emoji: '⚡',
    parameters: { creativity: 60, verbosity: 30, formality: 40, riskTolerance: 50 },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'creative-writing',
    name: 'Creative Writing',
    description: 'Expressive, imaginative responses with flair',
    emoji: '🎨',
    parameters: { creativity: 90, verbosity: 70, formality: 20, riskTolerance: 80 },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Formal, precise communication for business contexts',
    emoji: '💼',
    parameters: { creativity: 40, verbosity: 60, formality: 90, riskTolerance: 15 },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
];

// Parameter metadata for UI
export const PARAMETER_META = {
  creativity: {
    label: 'Creativity',
    description: 'Higher = more creative and varied responses',
    lowLabel: 'Focused',
    highLabel: 'Creative',
    icon: '🎯',
  },
  verbosity: {
    label: 'Verbosity',
    description: 'Controls response length and detail level',
    lowLabel: 'Concise',
    highLabel: 'Detailed',
    icon: '📝',
  },
  formality: {
    label: 'Formality',
    description: 'Tone from casual to professional',
    lowLabel: 'Casual',
    highLabel: 'Formal',
    icon: '👔',
  },
  riskTolerance: {
    label: 'Risk Tolerance',
    description: 'Willingness to try unconventional approaches',
    lowLabel: 'Safe',
    highLabel: 'Bold',
    icon: '🎲',
  },
} as const;

// Conversion helpers for API
export function parametersToApiConfig(params: PersonalityParameters) {
  return {
    temperature: (params.creativity / 100) * 1.5,  // 0-1.5 range
    maxTokens: Math.floor(500 + (params.verbosity / 100) * 3500),  // 500-4000
    systemModifiers: buildSystemModifiers(params),
  };
}

function buildSystemModifiers(params: PersonalityParameters): string {
  const modifiers: string[] = [];

  // Formality modifiers
  if (params.formality >= 70) {
    modifiers.push('Maintain a professional, formal tone.');
  } else if (params.formality <= 30) {
    modifiers.push('Use a casual, conversational tone.');
  }

  // Risk tolerance modifiers
  if (params.riskTolerance >= 70) {
    modifiers.push('Feel free to suggest unconventional or creative solutions.');
  } else if (params.riskTolerance <= 30) {
    modifiers.push('Stick to proven, safe approaches.');
  }

  // Verbosity modifiers
  if (params.verbosity >= 70) {
    modifiers.push('Provide comprehensive, detailed explanations.');
  } else if (params.verbosity <= 30) {
    modifiers.push('Be brief and to the point.');
  }

  return modifiers.join(' ');
}
