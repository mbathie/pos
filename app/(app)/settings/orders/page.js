'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { NumberInput } from '@/components/ui/number-input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function OrderSettingsPage() {
  const [greenMinutes, setGreenMinutes] = useState(2)
  const [orangeMinutes, setOrangeMinutes] = useState(5)
  const [redMinutes, setRedMinutes] = useState(10)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/org/settings')
        if (res.ok) {
          const data = await res.json()
          setGreenMinutes(data.bumpScreenGreenMinutes ?? 2)
          setOrangeMinutes(data.bumpScreenOrangeMinutes ?? 5)
          setRedMinutes(data.bumpScreenRedMinutes ?? 10)
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    if (greenMinutes >= orangeMinutes) {
      toast.error('Green threshold must be less than orange')
      return
    }
    if (orangeMinutes >= redMinutes) {
      toast.error('Orange threshold must be less than red')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/org/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bumpScreenGreenMinutes: greenMinutes,
          bumpScreenOrangeMinutes: orangeMinutes,
          bumpScreenRedMinutes: redMinutes
        })
      })

      if (res.ok) {
        toast.success('Settings saved')
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Orders</h3>
        <p className="text-sm text-muted-foreground">
          Configure order bump screen display settings.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Bump Screen Color Thresholds</CardTitle>
            <CardDescription>
              Orders on the bump screen change color based on how long they&apos;ve been waiting. Set the minute thresholds for each color level.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-green-500/40 border border-green-500/40" />
                <Label htmlFor="greenMinutes">Green (on track)</Label>
              </div>
              <div className="flex items-center gap-2">
                <NumberInput
                  id="greenMinutes"
                  min={0}
                  max={120}
                  value={greenMinutes}
                  onChange={setGreenMinutes}
                  className="w-24"
                  disabled={loading}
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Orders turn green after this many minutes.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-yellow-500/40 border border-yellow-500/40" />
                <Label htmlFor="orangeMinutes">Orange (attention needed)</Label>
              </div>
              <div className="flex items-center gap-2">
                <NumberInput
                  id="orangeMinutes"
                  min={0}
                  max={120}
                  value={orangeMinutes}
                  onChange={setOrangeMinutes}
                  className="w-24"
                  disabled={loading}
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Orders turn orange after this many minutes.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-red-500/40 border border-red-500/40" />
                <Label htmlFor="redMinutes">Red (urgent)</Label>
              </div>
              <div className="flex items-center gap-2">
                <NumberInput
                  id="redMinutes"
                  min={0}
                  max={120}
                  value={redMinutes}
                  onChange={setRedMinutes}
                  className="w-24"
                  disabled={loading}
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Orders turn red after this many minutes.
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || loading}
              className="cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
