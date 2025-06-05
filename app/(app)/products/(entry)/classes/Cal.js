"use client"

import { useState, useEffect } from "react"
import dayjs from "dayjs"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export default function CalendarForm({ value = null, onChange }) {
  const [date, setDate] = useState(null)
  const [open, setOpen] = useState(false);

  // Keep date in sync with value prop
  useEffect(() => {
    if (value !== null && value !== undefined) {
      const newDate = dayjs(value)
      console.log(value)
      if (newDate.isValid()) {
        setDate(newDate.toDate())
      } else {
        setDate(null)
      }
    } else {
      setDate(null)
    }
  }, [value])

  const handleSelect = (selectedDate) => {
    if (!selectedDate) return

    const current = dayjs(date || undefined)
    // Preserve time components (hours, minutes, seconds, ms)
    const updatedDateTime = dayjs(selectedDate)
      .hour(current.hour())
      .minute(current.minute())
      .second(current.second())
      .millisecond(current.millisecond())
    onChange?.(updatedDateTime.toISOString())
    setDate(updatedDateTime.toDate())
    setOpen(false); // close the popover after selection
  }

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-42 pl-3 text-left font-normal", !date && "text-muted-foreground")}
          >
            {date && dayjs(date).isValid() ? dayjs(date).format("DD/MM/YYYY") : <span>Date</span>}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
