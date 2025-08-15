import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useGlobals } from '@/lib/globals'

export default function PinDialog({ open, onOpenChange, onSuccess }) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('checking') // 'checking', 'verify', 'set'
  const { setEmployee, employee } = useGlobals()

  // Check if employee has a pin when dialog opens
  useEffect(() => {
    if (open) {
      checkPinStatus()
    }
  }, [open])

  const checkPinStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/pin')
      const data = await response.json()

      if (response.ok) {
        setMode(data.hasPinSet ? 'verify' : 'set')
      } else {
        setError('Failed to check pin status')
        setMode('verify') // Default to verify mode
      }
    } catch (err) {
      setError('Failed to check pin status')
      setMode('verify') // Default to verify mode
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (mode === 'set') {
      if (pin.length !== 4 || confirmPin.length !== 4) {
        setError('PIN must be 4 digits')
        return
      }
      if (pin !== confirmPin) {
        setError('PINs do not match')
        return
      }
    } else {
      if (pin.length !== 4) {
        setError('PIN must be 4 digits')
        return
      }
    }

    setLoading(true)
    setError('')

    try {
      const body = mode === 'set' 
        ? { pin, confirmPin, action: 'set' }
        : { pin }

      const response = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok)
        throw new Error(data.error || 'Invalid PIN')

      console.log('PIN response:', { mode, success: data.success, hasPinSet: data.employee?.hasPinSet })

      // Update global employee state with pinAuth timestamp
      // Include the current employee data to preserve all fields
      setEmployee(prev => ({
        ...prev,
        ...data.employee,
        pinAuth: data.pinAuth,
        pin: mode === 'set' ? parseInt(pin, 10) : prev?.pin
      }))

      // Clear form
      setPin('')
      setConfirmPin('')
      
      // Call success callback and close dialog
      onSuccess?.(data)
      onOpenChange(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(value)
    setError('')
  }

  const handleConfirmPinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setConfirmPin(value)
    setError('')
  }

  const handleClose = () => {
    setPin('')
    setConfirmPin('')
    setError('')
    setMode('checking')
    onOpenChange(false)
  }

  if (mode === 'checking') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="w-72">
          <DialogHeader>
            <DialogTitle>Checking PIN Status</DialogTitle>
            <DialogDescription>
              Please wait while we check your account...
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-72">
        <DialogHeader>
          <DialogTitle>
            {mode === 'set' ? 'Set Employee PIN' : 'Enter Employee PIN'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'set' 
              ? 'You need to set a 4-digit PIN to access the shop. This PIN will be required for future transactions.'
              : 'Please enter your 4-digit employee PIN to access the shop'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 text-sm">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={mode === 'set' ? 'Set your 4-digit PIN' : 'PIN'}
              value={pin}
              onChange={handlePinChange}
              className={`w-52 mx-auto text-center tracking-widest ${error ? 'border-destructive focus:border-destructive' : ''}`}
              maxLength={4}
              autoFocus
            />
            {mode === 'set' && (
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Confirm"
                value={confirmPin}
                onChange={handleConfirmPinChange}
                className={`w-52 mx-auto text-center tracking-widest ${error ? 'border-destructive focus:border-destructive' : ''}`}
                maxLength={4}
              />
            )}
          </div>
          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}
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
              disabled={loading || pin.length !== 4 || (mode === 'set' && confirmPin.length !== 4)}
            >
              {loading ? 'Processing...' : (mode === 'set' ? 'Set PIN' : 'Verify PIN')}
            </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 