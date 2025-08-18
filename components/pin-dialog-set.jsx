import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function SimplePinSet({ open, onSuccess, onCancel }) {
  const [mode, setMode] = useState('loading') // 'loading', 'set', 'verify'
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      checkPinStatus()
    }
  }, [open])

  const checkPinStatus = async () => {
    try {
      const response = await fetch('/api/auth/pin/status')
      const data = await response.json()
      
      console.log('PIN status check:', data)
      
      if (response.ok) {
        setMode(data.hasPinSet ? 'verify' : 'set')
      } else {
        setError('Failed to check PIN status')
        setMode('set') // Default to set mode on error
      }
    } catch (err) {
      console.error('Error checking PIN status:', err)
      setError('Network error')
      setMode('set')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (mode === 'set') {
      if (pin.length !== 4) {
        setError('PIN must be exactly 4 digits')
        return
      }
      if (pin !== confirmPin) {
        setError('PINs do not match')
        return
      }
    } else {
      if (pin.length !== 4) {
        setError('Please enter your 4-digit PIN')
        return
      }
    }

    setLoading(true)

    try {
      const endpoint = mode === 'set' ? '/api/auth/pin/set' : '/api/auth/pin/verify'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      })

      const data = await response.json()
      console.log(`PIN ${mode} response:`, data)

      if (response.ok) {
        onSuccess()
      } else {
        setError(data.error || `Failed to ${mode} PIN`)
      }
    } catch (err) {
      console.error(`Error ${mode}ting PIN:`, err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'loading') {
    return (
      <Dialog open={open}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Checking PIN Status</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'set' ? 'Set Your PIN' : 'Enter Your PIN'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'set' 
              ? 'Create a 4-digit PIN for quick access to the shop'
              : 'Enter your 4-digit PIN to access the shop'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4" autoComplete="off">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={mode === 'set' ? 'Enter 4-digit PIN' : 'PIN'}
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                setPin(value)
                setError('')
              }}
              maxLength={4}
              className="text-center text-2xl tracking-widest"
              style={{ WebkitTextSecurity: 'disc' }}
              autoComplete="one-time-code"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-lpignore="true"
              data-form-type="other"
              name={`pin-${Date.now()}`}
              autoFocus
              disabled={loading}
            />

            {mode === 'set' && (
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Confirm PIN"
                value={confirmPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setConfirmPin(value)
                  setError('')
                }}
                maxLength={4}
                className="text-center text-2xl tracking-widest"
                style={{ WebkitTextSecurity: 'disc' }}
                autoComplete="one-time-code"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-lpignore="true"
                data-form-type="other"
                name={`confirm-pin-${Date.now()}`}
                disabled={loading}
              />
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || (mode === 'set' ? pin.length !== 4 || confirmPin.length !== 4 : pin.length !== 4)}
              className="flex-1"
            >
              {loading ? 'Processing...' : mode === 'set' ? 'Set PIN' : 'Verify'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}