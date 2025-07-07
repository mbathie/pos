'use client'
// import { useGlobals } from "@/lib/globals"
import { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '@/components/ui/select'
import SignatureCanvas from 'react-signature-canvas'

export default function Page() {
  const [ org, setOrg ] = useState()
  const params = useParams()

  useEffect(() => {
    const fetchOrg = async () => {
      if (!params?.id) return
      const res = await fetch(`/api/orgs/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        console.log(data)
        setOrg(data.org)
      }
    }
    fetchOrg()
  }, [params.id])
  
  const sigRef = useRef(null)
  const clear = () => {
    sigRef.current.clear()
    setCustomer({...customer, signature: ""})
  }
  const getSig = () => {
    const dataURL = sigRef.current.getTrimmedCanvas().toDataURL('image/png')
    setCustomer({...customer, signature: dataURL})
  }

  const [ customer, setCustomer ] = useState({name: "", nameParent: "", email: "", phone: "", signature: ""})
  const [ address, setAddress ] = useState({
    address1: "",
    city: "",
    state: "",
    postcode: ""
  })
  const [ agree, setAgree ] = useState(false)
  const [ submitted, setSubmitted ] = useState(false)
  const [ errors, setErrors ] = useState([])

  useEffect(() => {
    setErrors([])
  }, [customer, address, agree])

  const waiverSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    address1: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    postcode: z.string().min(4),
    agree: z.literal(true),
    signature: z.string().min(100),
  })
  const result = waiverSchema.safeParse({
    ...customer,
    ...address,
    agree,
  })
  const isValid = result.success

  const register = async () => {
    const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + "/api/unauth/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...customer, ...address, agree, org }),
    })

    if (!res.ok) {
      const { error, field } = await res.json()
      setErrors([{ error: error || "An error occurred", field }])
      return
    }

    // Reset all form states before marking as submitted
    setCustomer({ name: "", email: "", phone: "", signature: "", nameParent: "" });
    setAddress({ address1: "", city: "", state: "", postcode: "" });
    setAgree(false);
    setErrors([]);
    setSubmitted(true);
  }

  if (submitted) return (
    <div className="flex flex-col gap-4 mt-10 items-center">
      <div className="text-lg text-center">Submitted successfully</div>
      <Button className='w-64' onClick={() => setSubmitted(false)}>Complete another waiver</Button>
    </div>
  )

  return (
    <div className="p-4 flex flex-col items-center gap-4">

      <div>
        Waiver for <span className="font-semibold underline">{org?.name}</span>
      </div>

      <Card className='md:w-3/4 flex mx-auto'>

        <CardContent className='flex flex-col gap-4'>

          <Textarea className="h-40" defaultValue="Waiver content goes here" />

          <div className="flex justfiy-center items-center gap-2">
            <Checkbox checked={agree} onCheckedChange={setAgree} />
            <div className="text-sm">I agree</div>
          </div>

          <div className="flex flex-col gap-4 items-start *:min-w-72">

            <div className="flex gap-4 w-full">
              <div className="flex flex-col gap-2 w-full">
                <Label>Name</Label>
                <Input
                  type="text"
                  placeholder="Name"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  className=''
                />
              </div>
              <div className="flex flex-col gap-2 w-full">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="Email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  className={errors[0]?.field === "email" ? "border-red-500" : ""}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 md:w-1/2 w-full md:pr-2">
              <Label>Phone</Label>
              <Input
                type="text"
                placeholder="Phone"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Label>Address</Label>
              <Input
                type="text"
                placeholder="Address Line 1"
                value={address.address1 || ""}
                onChange={(e) => setAddress({ ...address, address1: e.target.value })}
              />
            </div>

            <div className="flex w-full gap-4">
              <div className="flex flex-col gap-2 w-1/2">
                <Label>City</Label>
                <Input
                  type="text"
                  placeholder="City"
                  value={address.city || ""}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                />
              </div>
              {/* <div className="flex gap-4"> */}
                <div className="flex flex-col gap-2 w-1/2">
                  <Label htmlFor="state">State</Label>
                  <Select value={address.state || ""} onValueChange={(value) => setAddress({ ...address, state: value })}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NSW">NSW</SelectItem>
                      <SelectItem value="VIC">VIC</SelectItem>
                      <SelectItem value="QLD">QLD</SelectItem>
                      <SelectItem value="WA">WA</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="TAS">TAS</SelectItem>
                      <SelectItem value="ACT">ACT</SelectItem>
                      <SelectItem value="NT">NT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              {/* </div> */}
            </div>

            <div className="flex flex-col gap-2 md:w-1/2 md:pr-2 w-full">
              <Label>Postcode</Label>
              <Input
                type="text"
                placeholder="Postcode"
                value={address.postcode || ""}
                onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
              />
            </div>
          </div>


          <div className="flex flex-col gap-2">
            <Label>Signature</Label>
            <SignatureCanvas
              ref={sigRef}
              penColor="white"
              canvasProps={{ height: 200, className: 'w-full border border-card-foreground/20 rounded-lg bg-accent/50' }}
              onEnd={() => getSig()}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={clear}>Clear</Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <div className="flex gap-1 flex-col">
              <Label>Parent Guardian Name</Label>
              <Label className='text-xs font-normal text-accent-foreground/80'>Only required if signing on behalf of a child / dependent</Label>
            </div>
            <Input
              type="text"
              placeholder="Parent/Guardian Name"
              value={customer.nameParent}
              onChange={(e) => setCustomer({ ...customer, nameParent: e.target.value })}
              className=''
            />
          </div>

          {errors.length > 0 && (
            <div className="text-sm bg-red-400/60 p-4 rounded-lg border border-red-500">
              {errors.map((err, i) => (
                <div key={i}>{err.error || err}</div>
              ))}
            </div>
          )}

          <Button disabled={!isValid} onClick={register}>Submit</Button>

        </CardContent>
      </Card>
    </div>
  )

}
