'use client'

import { useAtom, useSetAtom } from 'jotai'
import { sessionsAtom, currentSessionIdAtom } from '@/lib/store'
import { Shell } from '@/components/layout/shell'
import { Button } from '@/components/ui/button'
import { SettingsModal } from '@/components/settings/settings-modal'
import { 
  Sparkles, 
  Globe, 
  Terminal, 
  Search, 
  FileText, 
  Zap,
  ArrowRight 
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useRouter } from 'next/navigation'

const features = [
  {
    icon: Globe,
    title: 'Browser Control',
    description: 'Navigate, click, fill forms, and interact with web pages automatically.',
  },
  {
    icon: Search,
    title: 'Web Search',
    description: 'Search the web and extract information from multiple sources.',
  },
  {
    icon: Terminal,
    title: 'Terminal Access',
    description: 'Execute commands and scripts in a secure sandbox environment.',
  },
  {
    icon: FileText,
    title: 'File Operations',
    description: 'Read, write, and manipulate files and documents.',
  },
]

const examplePrompts = [
  'Search for the latest AI news and summarize the top 3 articles',
  'Open GitHub and create a new repository called "my-project"',
  'Find the weather in San Francisco and create a summary',
  'Navigate to Hacker News and tell me the top 5 stories',
]

export default function HomePage() {
  const [sessions, setSessions] = useAtom(sessionsAtom)
  const setCurrentSessionId = useSetAtom(currentSessionIdAtom)
  const router = useRouter()

  const handleNewSession = (initialPrompt?: string) => {
    const newSession = {
      id: uuidv4(),
      title: initialPrompt ? initialPrompt.slice(0, 50) + '...' : 'New Session',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        totalMessages: 0,
      },
    }
    setSessions([newSession, ...sessions])
    setCurrentSessionId(newSession.id)
    router.push(`/${newSession.id}${initialPrompt ? `?prompt=${encodeURIComponent(initialPrompt)}` : ''}`)
  }

  return (
    <Shell>
      <div className="flex flex-1 flex-col items-center justify-center p-8 overflow-auto">
        <div className="w-full max-w-3xl space-y-12">
          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Agent TARS
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              A multimodal AI agent that can browse the web, use tools, and complete complex tasks autonomously.
            </p>
            <Button
              onClick={() => handleNewSession()}
              size="lg"
              className="mt-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600"
            >
              <Zap className="h-4 w-4 mr-2" />
              Start New Session
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-4 rounded-lg border border-border bg-card hover:bg-card/80 transition-colors"
              >
                <feature.icon className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-medium text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Example Prompts */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground text-center">
              Try an example
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleNewSession(prompt)}
                  className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left group"
                >
                  <span className="text-sm text-foreground">{prompt}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SettingsModal />
    </Shell>
  )
}
