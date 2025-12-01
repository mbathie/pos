'use client'

import { ScheduleCalendar } from '@/components/schedule-calendar'

export default function CalendarPage() {
  return (
    <div className="px-4 pt-2 pb-4 h-full flex flex-col">
      <ScheduleCalendar className="flex-1" />
    </div>
  )
}
