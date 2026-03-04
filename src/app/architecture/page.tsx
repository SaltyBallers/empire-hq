'use client'

import { AppLayout } from '@/components/AppLayout'

const agents = [
  { name: 'Zak', id: 'main', model: 'Claude Opus', role: 'Orchestrator — strategy, planning, delegation', color: '#d97706' },
  { name: 'Zara', id: 'researcher', model: 'Claude Sonnet', role: 'Research sweeps, intel briefs, analysis', color: '#06b6d4' },
  { name: 'Duke', id: 'backend', model: 'Claude Sonnet', role: 'Supabase, Edge Functions, TypeScript', color: '#10b981' },
  { name: 'Logan', id: 'frontend', model: 'Claude Sonnet', role: 'React, Next.js, UI implementation', color: '#8b5cf6' },
  { name: 'Maya', id: 'reviewer', model: 'Claude Opus', role: 'Code review, quality gate', color: '#f43f5e' },
]

const tooling = [
  { name: 'OpenClaw', description: 'Agent orchestration platform', icon: '🤖' },
  { name: 'Supabase', description: 'Backend — PostgreSQL, Edge Functions, Auth', icon: '🔧' },
  { name: 'Vercel', description: 'Frontend hosting & CI/CD', icon: '▲' },
  { name: 'Cloudflare', description: 'DNS management', icon: '☁️' },
  { name: 'Trello', description: 'Project management (The Empire board)', icon: '📋' },
  { name: 'GitHub', description: 'Source control', icon: '🐙' },
  { name: 'Vitest', description: 'Testing framework', icon: '🧪' },
]

// Architecture diagram as styled component
function ArchitectureDiagram() {
  return (
    <div className="bg-card-bg border border-border rounded-lg p-6">
      <h2 className="text-xl font-semibold text-foreground mb-6">System Architecture</h2>
      
      <div className="space-y-8">
        {/* Application Flow */}
        <div>
          <h3 className="text-sm font-medium text-muted-fg uppercase tracking-wider mb-4">Application Flow</h3>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <DiagramNode label="User" sublabel="Browser" color="#3b82f6" />
            <Arrow />
            <DiagramNode label="Vercel" sublabel="Next.js App Router" color="#8b5cf6" />
            <Arrow />
            <DiagramNode label="Supabase" sublabel="Auth + DB + Edge Functions" color="#10b981" />
            <Arrow />
            <div className="flex flex-col gap-2">
              <DiagramNode label="Sleeper API" sublabel="Fantasy data" color="#f59e0b" small />
              <DiagramNode label="Instagram API" sublabel="Social media" color="#ec4899" small />
            </div>
          </div>
        </div>

        {/* Agent Pipeline */}
        <div>
          <h3 className="text-sm font-medium text-muted-fg uppercase tracking-wider mb-4">Agent Pipeline</h3>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <DiagramNode label="OpenClaw" sublabel="Orchestration" color="#d97706" />
            <Arrow />
            <div className="flex flex-col gap-2">
              {agents.map(a => (
                <DiagramNode key={a.id} label={a.name} sublabel={a.id} color={a.color} small />
              ))}
            </div>
            <Arrow />
            <DiagramNode label="GitHub" sublabel="Source control" color="#64748b" />
            <Arrow />
            <DiagramNode label="Vercel CI/CD" sublabel="Auto-deploy" color="#8b5cf6" />
          </div>
        </div>
      </div>
    </div>
  )
}

function DiagramNode({ label, sublabel, color, small }: { label: string; sublabel: string; color: string; small?: boolean }) {
  return (
    <div
      className={`border-2 rounded-lg text-center ${small ? 'px-3 py-1.5' : 'px-5 py-3'}`}
      style={{ borderColor: color }}
    >
      <div className={`font-semibold text-foreground ${small ? 'text-xs' : 'text-sm'}`}>{label}</div>
      <div className={`text-muted-fg ${small ? 'text-[10px]' : 'text-xs'}`}>{sublabel}</div>
    </div>
  )
}

function Arrow() {
  return (
    <svg className="w-6 h-6 text-muted-fg flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  )
}

export default function ArchitecturePage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Architecture</h1>
          <p className="text-muted-fg mt-2">System overview, agent roster, and tooling</p>
        </div>

        {/* Agent Roster */}
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Agent Roster</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 pr-4 text-muted-fg font-medium">Agent</th>
                  <th className="pb-3 pr-4 text-muted-fg font-medium">ID</th>
                  <th className="pb-3 pr-4 text-muted-fg font-medium">Model</th>
                  <th className="pb-3 text-muted-fg font-medium">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {agents.map(agent => (
                  <tr key={agent.id}>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: agent.color }}></div>
                        <span className="font-medium text-foreground">{agent.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <code className="text-xs bg-background px-2 py-0.5 rounded text-muted-fg">{agent.id}</code>
                    </td>
                    <td className="py-3 pr-4 text-muted-fg">{agent.model}</td>
                    <td className="py-3 text-muted-fg">{agent.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Architecture Diagram */}
        <ArchitectureDiagram />

        {/* Tooling */}
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Tooling</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tooling.map(tool => (
              <div key={tool.name} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                <span className="text-xl">{tool.icon}</span>
                <div>
                  <div className="font-medium text-foreground text-sm">{tool.name}</div>
                  <div className="text-xs text-muted-fg">{tool.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
