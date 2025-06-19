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

export default function LoginForm() {
  const router = useRouter()
  const [ error, setError ] = useState(false)
  const [ email, setEmail ] = useState("")
  const [ password, setPassword ] = useState("")
  const [ phone, setPhone ] = useState("")
  const [ name, setName ] = useState("")
  const [ nameEmployee, setNameEmployee ] = useState("")


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
        setError(error || "Login failed");
        return;
      }


      // Redirect to dashboard on success
      router.push("/dashboard");
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
              <CardTitle>Create a new <span className='bg-emerald-300 -underline'>&nbsp;business&nbsp;</span> account</CardTitle>
              <CardDescription>
                Enter your business info to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-3">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="m@awesomegym.com" required />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="email">Business Name</Label>
                    <Input id="email" type="email" value={name} onChange={(e) => setName(e.target.value)} placeholder="Awesome Gym" required />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="email">My Name</Label>
                    <Input id="email" type="email" value={nameEmployee} onChange={(e) => setNameEmployee(e.target.value)} placeholder="Dave" required />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="email">Phone</Label>
                    <Input id="phone" type="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0407 123 456" required />
                  </div>

                  <div className="grid gap-3">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                    </div>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button 
                      type="submit" 
                      className="w-full"
                      onClick={handleForm}
                    >
                      Create Account
                    </Button>

                  </div>
                </div>
                <div className="mt-4 text-center text-sm">
                  Already have an account?{" "}
                  <a href="/login" className="underline underline-offset-4">
                    Login here
                  </a>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}