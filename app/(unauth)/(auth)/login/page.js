'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useGlobals } from '@/lib/globals'

export default function LoginPage() {
  const router = useRouter()
  const [ error, setError ] = useState(false)
  const [ email, setEmail ] = useState("")
  const [ password, setPassword ] = useState("")

  const { setEmployee, setLocation, setLocations } = useGlobals()

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        setError(error || "Login failed");
        return; // Stop execution here if login failed
      }

      // Only proceed if login was successful
      const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/me`);
      
      if (!userRes.ok) {
        setError("Failed to load user data");
        return;
      }
      
      const data = await userRes.json();
      // Only set pinAuth if employee has a PIN configured
      const employeeData = { ...data.employee };
      // if (data.employee.pin != null) {
      //   employeeData.pinAuth = new Date();
      // }
      
      setEmployee(employeeData)
      setLocation(data.employee.location)

      const locationsRes = await fetch(`/api/locations`, { method: "GET" });
      const _l = await locationsRes.json()
      setLocations(_l)

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
            Login to your account
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email below to login to your account
          </p>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="m@example.com" 
              required 
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <a
                href="#"
                className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                Forgot your password?
              </a>
            </div>
            <Input 
              id="password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>
        <div className="text-center text-sm">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="underline underline-offset-4">
            Sign up
          </a>
        </div>
      </div>
    </div>
  );

}
