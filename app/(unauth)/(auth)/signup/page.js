'use client'
import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useGlobals } from '@/lib/globals'

export default function SignUpPage() {
  const [ error, setError ] = useState(false)
  const [ email, setEmail ] = useState("")
  const [ password, setPassword ] = useState("")
  const [ phone, setPhone ] = useState("")
  const [ name, setName ] = useState("")
  const [ nameEmployee, setNameEmployee ] = useState("")

  const { setEmployee, setLocation, setLocations, setDevice } = useGlobals()

  const handleForm = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + "/api/auth/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, nameEmployee, phone }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        setError(error || "Signup failed");
        return;
      }

      const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/me`);
      const data = await userRes.json();
      console.log(data)
      // Only set pinAuth if employee has a PIN configured
      const employeeData = { ...data.employee };
      // if (data.employee.pin != null) {
      //   employeeData.pinAuth = new Date();
      // }
      
      setEmployee(employeeData)

      // Fetch all locations
      const locationsRes = await fetch(`/api/locations`, { method: "GET" });
      const _l = await locationsRes.json()
      setLocations(_l)
      
      // Set the location based on selectedLocationId (which comes from browser tie)
      if (data.employee.selectedLocationId) {
        const selectedLocation = _l.find(loc => loc._id === data.employee.selectedLocationId);
        if (selectedLocation) {
          setLocation(selectedLocation);
        } else if (_l.length > 0) {
          // Fallback to first location if selected location not found
          setLocation(_l[0]);
        }
      } else if (_l.length > 0) {
        // Fallback to first location
        setLocation(_l[0]);
      }

      // Find and set the current device
      try {
        const browserRes = await fetch('/api/auth/browser-id')
        if (browserRes.ok) {
          const { browserId } = await browserRes.json()
          if (browserId) {
            // Search for device with matching browserId across all locations
            for (const loc of _l) {
              const device = loc.devices?.find(d => d.browserId === browserId)
              if (device) {
                setDevice(device)
                break
              }
            }
          }
        }
      } catch (err) {
        console.error('Error setting device:', err)
      }

      window.location.href = "/shop"
    } catch (err) {
      setError("Something went wrong");
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create your business account
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your business information to get started
          </p>
        </div>
        <form onSubmit={handleForm} className="flex flex-col gap-6">
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="business-name">Business Name</Label>
            <Input 
              id="business-name" 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Awesome Gym" 
              required 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Your Name</Label>
            <Input 
              id="name" 
              type="text" 
              value={nameEmployee} 
              onChange={(e) => setNameEmployee(e.target.value)} 
              placeholder="Dave Smith" 
              required 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="dave@awesomegym.com" 
              required 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input 
              id="phone" 
              type="tel" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              placeholder="0407 123 456" 
              required 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <Button type="submit" className="w-full">
            Create Account
          </Button>
        </form>
        <div className="text-center text-sm">
          Already have an account?{" "}
          <a href="/login" className="underline underline-offset-4">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
