'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TypographyLarge, TypographyMuted } from '@/components/ui/typography'
import { ArrowLeft, Save, Loader2, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import WysiwygEditor from '@/components/wysiwyg-editor'

export default function WaiverSettingsPage() {
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(Date.now())

  // Content state is managed here and passed to the WYSIWYG editor

  // Load existing waiver content
  useEffect(() => {
    const fetchWaiverContent = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/waiver/content')
        if (res.ok) {
          const data = await res.json()
          const loadedContent = data.content || getDefaultWaiverContent()
          setContent(loadedContent)
          setOriginalContent(loadedContent)
        } else {
          // Set default content if no waiver exists
          const defaultContent = getDefaultWaiverContent()
          setContent(defaultContent)
          setOriginalContent(defaultContent)
        }
      } catch (error) {
        console.error('Error fetching waiver content:', error)
        toast.error('Failed to load waiver content')
        // Set default content on error
        const defaultContent = getDefaultWaiverContent()
        setContent(defaultContent)
        setOriginalContent(defaultContent)
      } finally {
        setLoading(false)
      }
    }

    fetchWaiverContent()
  }, [])

  const getDefaultWaiverContent = () => {
    return `
      <h2>Liability Waiver and Release Agreement</h2>
      <p><strong>Please read this document carefully before signing.</strong></p>
      
      <h3>Assumption of Risk</h3>
      <p>I understand that participation in activities involves inherent risks, including but not limited to physical injury, property damage, or other harm. I voluntarily assume all risks associated with my participation.</p>
      
      <h3>Release of Liability</h3>
      <p>I hereby release, waive, discharge, and covenant not to sue the organization, its officers, employees, agents, and representatives from any and all liability, claims, demands, actions, or causes of action arising out of or related to any loss, damage, or injury that may be sustained by me during participation in activities.</p>
      
      <h3>Medical Treatment</h3>
      <p>I authorize the organization to provide or arrange for emergency medical treatment if necessary. I understand that I am responsible for any medical expenses incurred.</p>
      
      <h3>Photography Release</h3>
      <p>I grant permission for photographs or videos taken during activities to be used for promotional purposes.</p>
      
      <h3>Agreement</h3>
      <p>By signing below, I acknowledge that I have read and understood this waiver, and I agree to be bound by its terms.</p>
    `
  }


  const hasChanges = content !== originalContent && originalContent !== ''

  // Auto-save every 10 seconds if there are changes
  useEffect(() => {
    if (!hasChanges) return

    const autoSaveTimer = setTimeout(async () => {
      setSaving(true)
      try {
        const res = await fetch('/api/waiver/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        })

        if (res.ok) {
          setOriginalContent(content)
          setLastSaved(Date.now())
        }
      } catch (error) {
        console.error('Auto-save error:', error)
      } finally {
        setSaving(false)
      }
    }, 10000) // 10 seconds

    return () => clearTimeout(autoSaveTimer)
  }, [content, hasChanges])


  return (
    <div className="px-4 flex flex-col gap-4 mb-4">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <TypographyLarge>Waiver Content Settings</TypographyLarge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Legal Waiver Content</CardTitle>
          <TypographyMuted>
            Customize the legal waiver that customers must agree to when signing up for classes, courses, or activities.
            This content will be displayed to customers during the registration process.
          </TypographyMuted>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="h-96 bg-muted animate-pulse rounded-md" />
          ) : (
            <div className="relative">
              {/* Save status indicator */}
              <div className="absolute top-2 right-2 z-10">
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : hasChanges ? (
                  <Save className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </div>
              
              {/* WYSIWYG Editor */}
              <WysiwygEditor
                content={content}
                onChange={setContent}
                placeholder="Enter waiver content..."
                minHeight="400px"
                showToolbar={true}
                toolbarPosition="top"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}