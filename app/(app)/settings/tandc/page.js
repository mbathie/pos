'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TypographyLarge, TypographyMuted } from '@/components/ui/typography'
import { ArrowLeft, Save, Loader2, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import WysiwygEditor from '@/components/wysiwyg-editor'

export default function TermsAndConditionsSettingsPage() {
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(Date.now())

  // Content state is managed here and passed to the WYSIWYG editor

  // Load existing terms and conditions content
  useEffect(() => {
    const fetchTandCContent = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/orgs/tandc')
        if (res.ok) {
          const data = await res.json()
          const loadedContent = data.content || getDefaultTandCContent()
          setContent(loadedContent)
          setOriginalContent(loadedContent)
        } else {
          // Set default content if no terms and conditions exist
          const defaultContent = getDefaultTandCContent()
          setContent(defaultContent)
          setOriginalContent(defaultContent)
        }
      } catch (error) {
        console.error('Error fetching terms and conditions content:', error)
        toast.error('Failed to load terms and conditions content')
        // Set default content on error
        const defaultContent = getDefaultTandCContent()
        setContent(defaultContent)
        setOriginalContent(defaultContent)
      } finally {
        setLoading(false)
      }
    }

    fetchTandCContent()
  }, [])

  const getDefaultTandCContent = () => {
    return `
      <h2>Terms and Conditions</h2>
      <p><strong>Effective Date: [Date]</strong></p>
      
      <h3>1. Acceptance of Terms</h3>
      <p>By purchasing membership, classes, or services, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use our services.</p>
      
      <h3>2. Membership</h3>
      <p>Memberships are personal and non-transferable. Membership fees are non-refundable unless otherwise stated. Members must present valid identification upon request.</p>
      
      <h3>3. Payment Terms</h3>
      <p>All fees must be paid in advance. We accept cash, credit cards, and other approved payment methods. Recurring memberships will be automatically charged according to the billing cycle selected.</p>
      
      <h3>4. Cancellation Policy</h3>
      <p>Membership cancellations must be submitted in writing at least 30 days before the next billing cycle. Class bookings must be cancelled at least 24 hours in advance for a full refund.</p>
      
      <h3>5. Code of Conduct</h3>
      <p>All members and guests must behave respectfully towards staff and other members. We reserve the right to terminate membership for violations of our code of conduct without refund.</p>
      
      <h3>6. Facility Rules</h3>
      <p>Members must follow all posted facility rules and regulations. Proper attire and hygiene standards must be maintained at all times.</p>
      
      <h3>7. Privacy Policy</h3>
      <p>We respect your privacy and protect your personal information in accordance with applicable privacy laws. Your information will not be shared with third parties without your consent.</p>
      
      <h3>8. Limitation of Liability</h3>
      <p>To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of our services.</p>
      
      <h3>9. Modifications</h3>
      <p>We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Continued use of our services constitutes acceptance of modified terms.</p>
      
      <h3>10. Contact Information</h3>
      <p>For questions about these Terms and Conditions, please contact us at [contact information].</p>
    `
  }


  const hasChanges = content !== originalContent && originalContent !== ''

  // Auto-save every 10 seconds if there are changes
  useEffect(() => {
    if (!hasChanges) return

    const autoSaveTimer = setTimeout(async () => {
      setSaving(true)
      try {
        const res = await fetch('/api/orgs/tandc', {
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

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/tandc/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })

      if (res.ok) {
        setOriginalContent(content)
        setLastSaved(Date.now())
        toast.success('Terms and conditions saved successfully')
      } else {
        toast.error('Failed to save terms and conditions')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save terms and conditions')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full mx-auto px-4 mt-2 mb-12 space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/settings">
          <Button variant="outline" size="sm" className="cursor-pointer">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {saving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </div>
          )}
          {!saving && hasChanges && (
            <div className="text-sm text-yellow-600">Unsaved changes</div>
          )}
          {!saving && !hasChanges && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle className="h-4 w-4" />
              Saved
            </div>
          )}
          <Button 
            onClick={handleSave} 
            disabled={saving || !hasChanges}
            className="cursor-pointer"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Header */}
      <div>
        <TypographyLarge>Terms & Conditions Settings</TypographyLarge>
        <TypographyMuted>
          Customize the terms and conditions that customers must agree to when making purchases or signing up for services. This content will be displayed during the checkout and registration process.
        </TypographyMuted>
      </div>

      {/* Content Editor */}
      <WysiwygEditor 
        value={content}
        onChange={setContent}
        placeholder="Enter your terms and conditions content here..."
      />
    </div>
  )
}