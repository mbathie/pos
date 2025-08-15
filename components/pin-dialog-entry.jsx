import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useGlobals } from '@/lib/globals'

export default function PinDialogEntry({ open, onOpenChange, onSuccess }) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setEmployee, setLocation, employee } = useGlobals()


  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (pin.length !== 4) {
      setError('PIN must be 4 digits')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/pin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      })

      const data = await response.json()

      if (!response.ok)
        throw new Error(data.error || 'Invalid PIN')

      console.log('PIN verified:', { success: data.success, employee: data.employee, switched: data.switched })

      // If employee was switched, fetch the updated user data and update globals
      if (data.switched) {
        const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/me`)
        
        if (userRes.ok) {
          const userData = await userRes.json()
          setEmployee(userData.employee)
          window.location.reload()
        }
      }

      // Clear form
      setPin('')
      
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

  const handleClose = () => {
    setPin('')
    setError('')
    onOpenChange(false)
  }

  // if (mode === 'checking') {
  //   return (
  //     <Dialog open={open} onOpenChange={handleClose}>
  //       <DialogContent className="w-72">
  //         <DialogHeader>
  //           <DialogTitle>Checking PIN Status</DialogTitle>
  //           <DialogDescription>
  //             Please wait while we check your account...
  //           </DialogDescription>
  //         </DialogHeader>
  //         <div className="flex justify-center py-4">
  //           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  //         </div>
  //       </DialogContent>
  //     </Dialog>
  //   )
  // }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-72">
        <DialogHeader>
          <DialogTitle>Enter Employee PIN</DialogTitle>
          <DialogDescription>
            Please enter your 4-digit employee PIN to access the shop
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 text-sm">
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="PIN"
              value={pin}
              onChange={handlePinChange}
              className={`w-52 mx-auto text-center tracking-widest ${error ? 'border-destructive focus:border-destructive' : ''}`}
              maxLength={4}
              autoFocus
            />
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
              disabled={loading || pin.length !== 4}
            >
              {loading ? 'Processing...' : 'Verify PIN'}
            </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 