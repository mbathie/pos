'use client'

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { WaiverForm } from "@/components/waiver-form"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function ScheduleWaiverPage() {
  const params = useParams()
  const [org, setOrg] = useState(null)
  const [scheduleInfo, setScheduleInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const fetchScheduleInfo = async () => {
      if (!params?.id) return

      try {
        // Fetch schedule info and org details for this waiver link
        const res = await fetch(`/api/unauth/schedule-waiver/${params.id}`)

        if (res.ok) {
          const data = await res.json()
          setOrg(data.org)
          setScheduleInfo(data.scheduleInfo)
        } else {
          const error = await res.json()
          toast.error(error.message || "Failed to load waiver information")
        }
      } catch (error) {
        console.error('Error fetching schedule info:', error)
        toast.error("Failed to load waiver information")
      } finally {
        setLoading(false)
      }
    }

    fetchScheduleInfo()
  }, [params.id])

  const handleSubmit = async (formData) => {
    try {
      const res = await fetch(`/api/unauth/schedule-waiver/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const { error, field } = await res.json()
        throw { message: error || "An error occurred", field }
      }

      return await res.json()
    } catch (error) {
      throw error
    }
  }

  const handleSuccess = () => {
    setSubmitted(true)
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 mt-10 items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div className="text-lg text-center">Loading waiver...</div>
      </div>
    )
  }

  if (!org || !scheduleInfo) {
    return (
      <div className="flex flex-col gap-4 mt-10 items-center">
        <div className="text-lg text-center text-destructive">Invalid waiver link</div>
        <p className="text-sm text-muted-foreground">This link may have expired or is invalid.</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-4 mt-10 items-center">
        <div className="text-lg text-center">Waiver submitted successfully!</div>
        <p className="text-sm text-muted-foreground">
          You have been registered for {scheduleInfo.productName}
        </p>
        <Button className='w-64 cursor-pointer' onClick={() => setSubmitted(false)}>
          Complete another waiver
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col items-center gap-4">
      <div className="text-center mb-4">
        <h1 className="text-xl font-semibold mb-2">
          Waiver for <span className="underline">{org.name}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {scheduleInfo.productName} - {scheduleInfo.companyName}
        </p>
        {scheduleInfo.datetime && (
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(scheduleInfo.datetime).toLocaleDateString('en-AU', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
            {scheduleInfo.timeLabel && ` at ${scheduleInfo.timeLabel}`}
            {scheduleInfo.classLabel && ` (${scheduleInfo.classLabel})`}
          </p>
        )}
      </div>

      <WaiverForm
        org={org}
        onSubmit={handleSubmit}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
