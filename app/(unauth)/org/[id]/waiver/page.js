'use client'
import './waiver.css'
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
import { Calendar } from '@/components/ui/calendar';
import { ChevronDownIcon, Camera, Upload, User, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import React from 'react';

function DateOfBirthPicker({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(value ? new Date(value) : undefined);
  const userLocale = typeof window !== 'undefined' && navigator.language ? navigator.language : 'en-AU';
  console.log('Detected locale:', userLocale);

  React.useEffect(() => {
    if (date && onChange) {
      onChange(date);
    }
    // eslint-disable-next-line
  }, [date]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <Label htmlFor="dob" className="px-1">Date of birth</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="dob"
            className="w-full justify-between font-normal"
          >
            {date ? date.toLocaleDateString(userLocale) : "Select date"}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            captionLayout="dropdown"
            onSelect={(selectedDate) => {
              setDate(selectedDate);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function Page() {
  const [ org, setOrg ] = useState()
  const [ waiverContent, setWaiverContent ] = useState('')
  const params = useParams()

  useEffect(() => {
    const fetchOrg = async () => {
      if (!params?.id) return
      
      // For the "default" route, use the organization ID from the context
      // In production, this should get the org ID from session/auth context
      if (params.id === 'default') {
        // Use the known org ID for now
        const res = await fetch(`/api/orgs/68648690ecf12d3020902b9b`)
        if (res.ok) {
          const data = await res.json()
          console.log(data)
          setOrg(data.org)
          // Set waiver content from org or use default
          setWaiverContent(data.org?.waiverContent || getDefaultWaiverContent())
        } else {
          // If can't fetch org, just use default content
          setWaiverContent(getDefaultWaiverContent())
        }
      } else {
        const res = await fetch(`/api/orgs/${params.id}`)
        if (res.ok) {
          const data = await res.json()
          console.log(data)
          setOrg(data.org)
          // Set waiver content from org or use default
          setWaiverContent(data.org?.waiverContent || getDefaultWaiverContent())
        }
      }
    }
    fetchOrg()
  }, [params.id])

  const getDefaultWaiverContent = () => {
    return `
      <h2>Liability Waiver and Release Agreement</h2>
      <p><strong>Please read this document carefully before signing.</strong></p>
      
      <h3>Assumption of Risk</h3>
      <p>I understand that participation in activities involves inherent risks, including but not limited to physical injury, property damage, or other harm. I voluntarily assume all risks associated with my participation.</p>
      
      <h3>Release of Liability</h3>
      <p>I hereby release, waive, discharge, and covenant not to sue the organization, its officers, employees, agents, and representatives from any and all liability, claims, demands, actions, or causes of action arising out of or related to any loss, damage, or injury that may be sustained by me during participation in activities.</p>
      
      <h3>Medical Treatment</h3>
      <p>I authorize the organization to provide or arrange for emergency medical treatment if necessary. I understand that I am responsible for any medical expenses incurred.</p>
      
      <h3>Photography Release</h3>
      <p>I grant permission for photographs or videos taken during activities to be used for promotional purposes.</p>
      
      <h3>Agreement</h3>
      <p>By signing below, I acknowledge that I have read and understood this waiver, and I agree to be bound by its terms.</p>
    `
  }
  
  const sigRef = useRef(null)
  const clear = () => {
    sigRef.current.clear()
    setCustomer({...customer, signature: ""})
  }
  const getSig = () => {
    const dataURL = sigRef.current.getTrimmedCanvas().toDataURL('image/png')
    setCustomer({...customer, signature: dataURL})
  }

  const [ customer, setCustomer ] = useState({name: "", nameParent: "", email: "", phone: "", dob: "", gender: "", signature: "", photo: ""})
  const [ address, setAddress ] = useState({
    address1: "",
    city: "",
    state: "",
    postcode: ""
  })
  const [ agree, setAgree ] = useState(false)
  const [ submitted, setSubmitted ] = useState(false)
  const [ errors, setErrors ] = useState([])
  const [ showCamera, setShowCamera ] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    setErrors([])
  }, [customer, address, agree])

  // Initialize camera when modal opens
  useEffect(() => {
    if (showCamera) {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user', // Use front camera on mobile devices
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error('Error accessing camera:', err);
          alert('Unable to access camera. Please check permissions or use the upload option.');
          setShowCamera(false);
        }
      };
      startCamera();
    }
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCamera])

  const waiverSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    dob: z.string().min(1),
    gender: z.string().min(1),
    address1: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    postcode: z.string().min(4),
    agree: z.literal(true),
    signature: z.string().min(100),
    photo: z.string().min(1, "Photo is required"),
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
      body: JSON.stringify({ 
        ...customer, 
        ...address, 
        agree, 
        org,
        photo: customer.photo // Ensure photo is included
      }),
    })

    if (!res.ok) {
      const { error, field } = await res.json()
      setErrors([{ error: error || "An error occurred", field }])
      return
    }

    // Reset all form states before marking as submitted
    setCustomer({ name: "", email: "", phone: "", signature: "", nameParent: "", photo: "", dob: "", gender: "" });
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

          {/* Photo Capture Section */}
          <div className="flex flex-col gap-2">
            <Label>Photo</Label>
            <div className="flex gap-4">
              <div 
                className={`${customer.photo ? '' : 'border-2 border-dashed hover:bg-accent/50'} rounded-lg w-32 h-32 flex items-center justify-center cursor-pointer transition-colors relative`}
                onClick={() => customer.photo ? null : setShowCamera(true)}
              >
                {customer.photo ? (
                  <>
                    <div className="w-full h-full overflow-hidden rounded-lg">
                      <img 
                        src={customer.photo} 
                        alt="Captured" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-3 -right-3 h-6 w-6 z-10 opacity-100"
                      style={{ opacity: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomer({...customer, photo: ""});
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <div className="p-4">
                    <User className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              {!customer.photo && (
                <div className="flex flex-col gap-2 justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCamera(true)}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Take Photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setCustomer({...customer, photo: reader.result});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Camera Modal */}
          {showCamera && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-background rounded-lg p-4 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Take Photo</h3>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setShowCamera(false);
                      if (streamRef.current) {
                        streamRef.current.getTracks().forEach(track => track.stop());
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg"
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      const video = videoRef.current;
                      const canvas = canvasRef.current;
                      if (video && canvas) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(video, 0, 0);
                        const photoData = canvas.toDataURL('image/jpeg');
                        setCustomer({...customer, photo: photoData});
                        setShowCamera(false);
                        if (streamRef.current) {
                          streamRef.current.getTracks().forEach(track => track.stop());
                        }
                      }
                    }}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Capture
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCamera(false);
                      if (streamRef.current) {
                        streamRef.current.getTracks().forEach(track => track.stop());
                      }
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Display waiver content as HTML */}
          <div 
            className="p-4 border rounded-lg bg-muted/30 max-h-60 overflow-y-auto max-w-none waiver-content"
            dangerouslySetInnerHTML={{ __html: waiverContent }}
          />

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
            <div className="flex gap-4 w-full">
              <div className="flex flex-col gap-2 md:w-1/2 w-full">
                <DateOfBirthPicker
                  value={customer.dob}
                  onChange={(date) => setCustomer({ ...customer, dob: date ? date.toISOString().slice(0, 10) : '' })}
                />
              </div>
              <div className="flex flex-col gap-2 md:w-1/2 w-full">
                <Label>Gender</Label>
                <Select value={customer.gender} onValueChange={(value) => setCustomer({ ...customer, gender: value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
