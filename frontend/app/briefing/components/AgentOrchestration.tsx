'use client';

// Agent configurations
const AGENT_CONFIG = {
  offer: {
    name: 'Offer Analyst',
    description: 'Analyzing offer details and pricing structure',
  },
  supplier: {
    name: 'Supplier Scout',
    description: 'Researching supplier background and reputation',
  },
  market: {
    name: 'Market Analyst',
    description: 'Evaluating market conditions and alternatives',
  },
  outcome: {
    name: 'Strategy Advisor',
    description: 'Predicting outcomes and recommending tactics',
  },
  analyze: {
    name: 'Action Planner',
    description: 'Generating prioritized action items',
  },
};

type AgentKey = keyof typeof AGENT_CONFIG;

interface AgentCardProps {
  agentKey: AgentKey;
  status: 'idle' | 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  message?: string;
  isActive: boolean;
}

function AgentCard({ agentKey, status, progress, message, isActive }: AgentCardProps) {
  const config = AGENT_CONFIG[agentKey];
  
  return (
    <div className={`relative bg-white/5 backdrop-blur-xl border rounded-ds-xl p-5 transition-all duration-500 ${
      isActive ? 'border-ds-accent-2/50 shadow-lg' : 'border-white/10'
    } ${status === 'completed' ? 'opacity-80' : ''}`}>
      {status === 'running' && (
        <div className="absolute inset-0 rounded-ds-xl bg-ds-accent-2/10 animate-pulse" />
      )}
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-ds-md flex items-center justify-center bg-white/10">
            <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">{config.name}</h3>
            <p className="text-xs text-white/50">{config.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {(status === 'idle' || status === 'pending') && (
              <div className="w-3 h-3 rounded-full bg-white/20" />
            )}
            {status === 'running' && (
              <div className="w-3 h-3 rounded-full bg-ds-accent-2 animate-pulse" />
            )}
            {status === 'completed' && (
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {status === 'error' && (
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
        </div>

        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-ds-accent-1 to-ds-accent-2"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {message && status === 'running' && (
          <p className="mt-2 text-xs text-white/60 truncate">{message}</p>
        )}
      </div>
    </div>
  );
}

interface AgentStatus {
  status: 'idle' | 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  message: string;
}

interface AgentOrchestrationProps {
  overallProgress: number;
  getAgentStatus: (key: string) => AgentStatus;
}

export default function AgentOrchestration({ overallProgress, getAgentStatus }: AgentOrchestrationProps) {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Title */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          AI Agents at Work
        </h1>
        <p className="text-white/60 text-lg">
          Our specialized agents are analyzing your negotiation
        </p>
      </div>

      {/* Overall Progress */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-ds-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white font-medium">Overall Progress</span>
          <span className="text-ds-accent-2 font-semibold">{Math.round(overallProgress * 100)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-ds-accent-1 to-ds-accent-2 transition-all duration-500"
            style={{ width: `${overallProgress * 100}%` }}
          />
        </div>
      </div>

      {/* Agent Workflow */}
      <div className="space-y-6">
        {/* Stage 1 */}
        <div className="flex items-center gap-4">
          <div className="w-16 text-center">
            <div className="w-8 h-8 mx-auto rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm font-medium">1</div>
            <div className="w-0.5 h-6 bg-white/10 mx-auto mt-2" />
          </div>
          <div className="flex-1">
            <AgentCard 
              agentKey="offer"
              {...getAgentStatus('offer')}
              isActive={getAgentStatus('offer').status === 'running'}
            />
          </div>
        </div>

        {/* Stage 2 */}
        <div className="flex items-center gap-4">
          <div className="w-16 text-center">
            <div className="w-8 h-8 mx-auto rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm font-medium">2</div>
            <div className="w-0.5 h-6 bg-white/10 mx-auto mt-2" />
          </div>
          <div className="flex-1">
            <AgentCard 
              agentKey="supplier"
              {...getAgentStatus('supplier')}
              isActive={getAgentStatus('supplier').status === 'running'}
            />
          </div>
        </div>

        {/* Stage 3: Parallel */}
        <div className="flex items-start gap-4">
          <div className="w-16 text-center pt-5">
            <div className="w-8 h-8 mx-auto rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm font-medium">3</div>
            <div className="w-0.5 h-full bg-white/10 mx-auto mt-2 min-h-[120px]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-white/20 to-transparent" />
              <span className="text-xs text-white/40 uppercase tracking-wider px-2">Parallel</span>
              <div className="h-0.5 flex-1 bg-gradient-to-l from-white/20 to-transparent" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <AgentCard 
                agentKey="market"
                {...getAgentStatus('market')}
                isActive={getAgentStatus('market').status === 'running'}
              />
              <AgentCard 
                agentKey="outcome"
                {...getAgentStatus('outcome')}
                isActive={getAgentStatus('outcome').status === 'running'}
              />
            </div>
          </div>
        </div>

        {/* Stage 4 */}
        <div className="flex items-center gap-4">
          <div className="w-16 text-center">
            <div className="w-8 h-8 mx-auto rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm font-medium">4</div>
          </div>
          <div className="flex-1">
            <AgentCard 
              agentKey="analyze"
              {...getAgentStatus('analyze')}
              isActive={getAgentStatus('analyze').status === 'running'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

