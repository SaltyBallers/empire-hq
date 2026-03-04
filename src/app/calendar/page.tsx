'use client'

import { useMemo, useState } from 'react'
import { AppLayout } from '@/components/AppLayout'

interface ScheduledEvent {
  id: string
  name: string
  description: string
  frequency: 'daily' | 'monthly' | 'one-shot'
  time: string
  agent?: string
  type: 'recurring' | 'expiration'
  // For one-shot events
  date?: string
}

const SCHEDULED_EVENTS: ScheduledEvent[] = [
  {
    id: 'nightly-archive',
    name: 'Nightly Trello Archive',
    description: 'Archives completed Trello cards',
    frequency: 'daily',
    time: '00:01',
    agent: 'Zak',
    type: 'recurring',
  },
  {
    id: 'morning-intel',
    name: 'Morning Intel Brief',
    description: 'Email + calendar scan',
    frequency: 'daily',
    time: '06:45',
    agent: 'Zara',
    type: 'recurring',
  },
  {
    id: 'morning-report',
    name: 'Morning Report',
    description: 'Pipeline status to Bill',
    frequency: 'daily',
    time: '07:00',
    agent: 'Zak',
    type: 'recurring',
  },
  {
    id: 'smb-refresh',
    name: 'SMB Growth Engine Monthly Refresh',
    description: 'Refresh vertical benchmarks',
    frequency: 'monthly',
    time: '10:00',
    agent: 'Zara',
    type: 'recurring',
  },
  {
    id: 'supabase-token',
    name: 'Supabase Token Expiry Alert',
    description: 'Token renewal reminder — expires May 25, 2026',
    frequency: 'one-shot',
    time: '09:00',
    date: '2026-05-25',
    type: 'expiration',
  },
  {
    id: 'instagram-token',
    name: 'Instagram Token Expiry',
    description: '7 days before May 2 expiry — renew token',
    frequency: 'one-shot',
    time: '09:00',
    date: '2026-04-25',
    type: 'expiration',
  },
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function getEventsForDay(day: number, month: number, year: number, events: ScheduledEvent[]): ScheduledEvent[] {
  return events.filter(event => {
    if (event.type === 'expiration' && event.date) {
      const d = new Date(event.date)
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
    }
    if (event.frequency === 'daily') return true
    if (event.frequency === 'monthly' && day === 1) return true
    return false
  })
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const days: (number | null)[] = []

    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)

    return days
  }, [year, month])

  const today = new Date()
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-fg mt-2">Scheduled activities, cron jobs, and token expirations</p>
        </div>

        {/* Calendar Header */}
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 hover:bg-background rounded-md transition-colors">
              <svg className="w-5 h-5 text-muted-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-semibold text-foreground">
              {currentDate.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-background rounded-md transition-colors">
              <svg className="w-5 h-5 text-muted-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-fg py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} className="min-h-[80px]" />
              
              const events = getEventsForDay(day, month, year, SCHEDULED_EVENTS)
              const hasExpiration = events.some(e => e.type === 'expiration')
              
              return (
                <div
                  key={day}
                  className={`min-h-[80px] p-1.5 rounded-md border transition-colors ${
                    isToday(day) ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'
                  }`}
                >
                  <div className={`text-xs font-medium mb-1 ${isToday(day) ? 'text-primary' : 'text-muted-fg'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {events.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${
                          event.type === 'expiration'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-primary/15 text-primary'
                        }`}
                        title={`${event.name} — ${event.time} ET${event.agent ? ` (${event.agent})` : ''}`}
                      >
                        {event.name.length > 15 ? event.name.substring(0, 15) + '…' : event.name}
                      </div>
                    ))}
                    {events.length > 3 && (
                      <div className="text-[10px] text-muted-fg px-1">+{events.length - 3} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-primary/15 border border-primary/30"></div>
              <span className="text-muted-fg">Recurring</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30"></div>
              <span className="text-muted-fg">Token Expiration</span>
            </div>
          </div>
        </div>

        {/* Event List */}
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">All Scheduled Activities</h2>
          <div className="space-y-3">
            {SCHEDULED_EVENTS.map(event => (
              <div key={event.id} className={`flex items-start gap-4 p-4 rounded-lg border ${
                event.type === 'expiration' ? 'border-red-500/20 bg-red-500/5' : 'border-border bg-background/50'
              }`}>
                <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  event.type === 'expiration' ? 'bg-red-400' : 'bg-primary'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground text-sm">{event.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      event.type === 'expiration'
                        ? 'bg-red-500/20 text-red-400'
                        : event.frequency === 'daily'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {event.frequency === 'one-shot' && event.date
                        ? new Date(event.date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
                        : event.frequency}
                    </span>
                  </div>
                  <p className="text-xs text-muted-fg mt-1">{event.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-fg">
                    <span>⏰ {event.time} ET</span>
                    {event.agent && <span>🤖 {event.agent}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
