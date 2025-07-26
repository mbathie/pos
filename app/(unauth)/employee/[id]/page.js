'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { z } from 'zod'

const setupSchema = z.object({
  password: z.string().min(4, 'Password must be at least 4 characters'),
  confirmPassword: z.string(),
  pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d+$/, 'PIN must contain only numbers'),
  confirmPin: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.pin === data.confirmPin, {
  message: "PINs don't match", 
  path: ["confirmPin"],
})

export default function EmployeeSetupPage() {
  const params = useParams()
  const router = useRouter()
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    pin: '',
    confirmPin: ''
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await fetch(`/api/unauth/employees/${params.id}`)
        if (res.ok) {
          const data = await res.json()
          
          // If employee already has a password, redirect to login
          if (data.hasPassword) {
            router.push('/login')
            return
          }
          
          setEmployee(data)
        } else {
          console.error('Failed to fetch employee')
          router.push('/login')
        }
      } catch (error) {
        console.error('Error fetching employee:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchEmployee()
    }
  }, [params.id, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate form
    const result = setupSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors = {}
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    setSaving(true)

    try {
      const res = await fetch(`/api/unauth/employees/${params.id}/setup-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: formData.password,
          pin: formData.pin
        })
      })

      if (res.ok) {
        router.push('/login?message=Password set successfully')
      } else {
        const error = await res.json()
        setErrors({ general: error.message || 'Failed to set password' })
      }
    } catch (error) {
      setErrors({ general: 'An error occurred. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Employee not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Setup your account</CardTitle>
          <CardDescription>
            Welcome {employee.name}! Please set your password and PIN to complete your account setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="text-red-500 text-sm text-center">{errors.general}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <div className="text-red-500 text-sm">{errors.password}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={errors.confirmPassword ? "border-red-500" : ""}
              />
              {errors.confirmPassword && (
                <div className="text-red-500 text-sm">{errors.confirmPassword}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin">4-Digit PIN</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Enter 4-digit PIN"
                maxLength={4}
                value={formData.pin}
                onChange={(e) => handleInputChange('pin', e.target.value.replace(/\D/g, ''))}
                className={errors.pin ? "border-red-500" : ""}
              />
              {errors.pin && (
                <div className="text-red-500 text-sm">{errors.pin}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPin">Confirm PIN</Label>
              <Input
                id="confirmPin"
                type="password"
                placeholder="Confirm your PIN"
                maxLength={4}
                value={formData.confirmPin}
                onChange={(e) => handleInputChange('confirmPin', e.target.value.replace(/\D/g, ''))}
                className={errors.confirmPin ? "border-red-500" : ""}
              />
              {errors.confirmPin && (
                <div className="text-red-500 text-sm">{errors.confirmPin}</div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={saving}
            >
              {saving ? 'Setting up...' : 'Complete Setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 