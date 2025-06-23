'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useGlobals } from '@/lib/globals'

export default function LoginForm() {
  const router = useRouter()
  const [ error, setError ] = useState(false)
  const [ email, setEmail ] = useState("")
  const [ password, setPassword ] = useState("")

  const { setEmployee, setLocation } = useGlobals()

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
        return;
      }

      const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/me`);
      const data = await userRes.json();
      console.log(data)
      setEmployee(data.employee)
      setLocation(data.employee.location)

      window.location.href = "/products/shop"
    } catch (err) {
      setError("Something went wrong");
    }
  };

  return (
    <div className="flex items-center justify-center mx-auto">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Login to your account</CardTitle>
              <CardDescription>
                Enter your email below to login to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-3">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="m@example.com" required />
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <a
                        href="#"
                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                        Forgot your password?
                      </a>
                    </div>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button 
                      type="submit" 
                      className="w-full"
                      onClick={handleLogin}
                    >
                      Login
                    </Button>

                  </div>
                </div>
                <div className="mt-4 text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <a href="/signup" className="underline underline-offset-4">
                    Sign up
                  </a>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
