'use client'
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, Loader2 } from 'lucide-react'
import { z } from 'zod'

// Email validation schema
const emailSchema = z.string().email('Please enter a valid email address')

export function ResendReceiptDialog({ open, onOpenChange, transaction }) {
  const [email, setEmail] = useState(transaction?.customer?.email || '')
  const [sending, setSending] = useState(false)
  const [isValidEmail, setIsValidEmail] = useState(false)

  // Validate email whenever it changes
  useEffect(() => {
    if (email) {
      try {
        emailSchema.parse(email)
        setIsValidEmail(true)
      } catch {
        setIsValidEmail(false)
      }
    } else {
      setIsValidEmail(false)
    }
  }, [email])

  const handleSend = async () => {
    // Validate email using Zod
    try {
      emailSchema.parse(email)
    } catch (error) {
      toast.error(error.errors[0]?.message || 'Please enter a valid email address')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          transactionId: transaction._id
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Receipt sent', {
          description: `Receipt has been sent to ${email}`
        })
        onOpenChange(false)
        setEmail('')
      } else {
        toast.error('Failed to send receipt', {
          description: data.error || 'An error occurred while sending the receipt'
        })
      }
    } catch (error) {
      console.error('Error sending receipt:', error)
      toast.error('Failed to send receipt', {
        description: 'An error occurred while sending the receipt'
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Resend Receipt</DialogTitle>
          <DialogDescription>
            Enter the email address to send the receipt to.
            {transaction?.customer?.name && (
              <div className="mt-2 text-sm">
                Customer: <span className="font-medium">{transaction.customer.name}</span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="customer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={sending || !isValidEmail}
            className="cursor-pointer"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Receipt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}