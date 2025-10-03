import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function DiscountPinDialog({ open, onOpenChange, onSuccess, permission = 'discount:custom' }) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Determine the action type from permission
  const isRefund = permission.includes('refund');
  const actionName = isRefund ? 'refund' : 'custom discount';
  const actionNameCapitalized = isRefund ? 'Refund' : 'Discount';

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (pin.length !== 4) {
      setError('PIN must be 4 digits')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/pincheck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin, permission }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          toast.error(`Invalid PIN or insufficient permissions for ${actionName}`)
        } else {
          toast.error(data.error || 'Invalid PIN')
        }
        setError(data.error || 'Invalid PIN')
        return
      }

      // Success
      toast.success(`${actionNameCapitalized} authorized by ${data.authorizer.name}`)
      setPin('')
      onSuccess?.(data)
      onOpenChange(false)
    } catch (err) {
      const errorMsg = 'Failed to verify PIN'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(value)
    setError('')
  }

  const handleClose = () => {
    setPin('')
    setError('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-72">
        <DialogHeader>
          <DialogTitle className="text-center">
            Manager Authorization Required
          </DialogTitle>
          <DialogDescription>
            {isRefund
              ? "Refunds require manager approval. Please enter a manager's 4-digit PIN to authorize this refund."
              : "Custom discounts require manager approval. Please enter a manager's 4-digit PIN to authorize this discount."
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 text-sm">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Manager PIN"
              value={pin}
              onChange={handlePinChange}
              className={`w-52 mx-auto text-center tracking-widest ${error ? 'border-destructive focus:border-destructive' : ''}`}
              maxLength={4}
              autoFocus
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="w-52"
              >
                Cancel
              </Button>
            </div>
            <div>
              <Button
                className="w-52"
                type="submit"
                disabled={loading || pin.length !== 4}
              >
                {loading ? 'Verifying...' : `Authorize ${actionNameCapitalized}`}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}