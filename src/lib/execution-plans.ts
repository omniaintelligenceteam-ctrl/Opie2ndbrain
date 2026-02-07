// In-memory store for pending execution plans
// In production, this would be replaced with Redis or database storage

export interface ToolCall {
  tool: string;
  args: Record<string, any>;
  description: string;
}

export interface ExecutionPlan {
  id: string;
  sessionId: string;
  message: string;
  plannedActions: string[];
  toolCalls: ToolCall[];
  status: 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'error';
  createdAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

// In-memory storage (replace with Redis/DB in production)
const executionPlans = new Map<string, ExecutionPlan>();

export const ExecutionPlanStore = {
  // Create a new execution plan
  create(plan: Omit<ExecutionPlan, 'id' | 'createdAt' | 'status'>): ExecutionPlan {
    const id = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullPlan: ExecutionPlan = {
      ...plan,
      id,
      status: 'pending',
      createdAt: new Date(),
    };
    executionPlans.set(id, fullPlan);
    return fullPlan;
  },

  // Get a plan by ID
  get(id: string): ExecutionPlan | null {
    return executionPlans.get(id) || null;
  },

  // Update a plan's status
  updateStatus(id: string, status: ExecutionPlan['status'], data?: Partial<ExecutionPlan>): ExecutionPlan | null {
    const plan = executionPlans.get(id);
    if (!plan) return null;

    const updatedPlan = {
      ...plan,
      status,
      ...data,
    };

    if (status === 'approved') {
      updatedPlan.approvedAt = new Date();
    }
    if (status === 'completed' || status === 'error') {
      updatedPlan.completedAt = new Date();
    }

    executionPlans.set(id, updatedPlan);
    return updatedPlan;
  },

  // Get all plans for a session
  getBySession(sessionId: string): ExecutionPlan[] {
    return Array.from(executionPlans.values())
      .filter(plan => plan.sessionId === sessionId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // Clean up old plans (older than 1 hour)
  cleanup(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [id, plan] of Array.from(executionPlans.entries())) {
      if (plan.createdAt < oneHourAgo) {
        executionPlans.delete(id);
      }
    }
  },

  // Get all pending plans (for debugging)
  getAllPending(): ExecutionPlan[] {
    return Array.from(executionPlans.values())
      .filter(plan => plan.status === 'pending')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },
};

// Auto-cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    ExecutionPlanStore.cleanup();
  }, 10 * 60 * 1000);
}