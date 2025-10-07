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
import { Progress } from "@/components/ui/progress"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '@/components/ui/select'
import SignatureCanvas from 'react-signature-canvas'
import { Calendar } from '@/components/ui/calendar';
import { ChevronDownIcon, Camera, Upload, User, X, Plus, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from "sonner";
import React from 'react';
import { generateObjectId } from '@/lib/utils';

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
  const [ hasScrolledWaiver, setHasScrolledWaiver ] = useState(false)
  const [ scrollProgress, setScrollProgress ] = useState(0)
  const waiverContentRef = useRef(null)
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
  const sigContainerRef = useRef(null)
  
  const clear = () => {
    console.log('🗑️ Signature manually cleared')
    sigRef.current.clear()
    setCustomer({...customer, signature: ""})
  }
  
  const getSig = () => {
    if (!sigRef.current) return

    // Use toDataURL directly instead of getTrimmedCanvas
    const canvas = sigRef.current.getCanvas()
    if (!canvas) return

    const dataURL = canvas.toDataURL('image/png')
    console.log('✍️ Signature captured:', {
      length: dataURL.length,
      preview: dataURL.substring(0, 50)
    })
    setCustomer({...customer, signature: dataURL})
  }
  
  // Handle signature canvas resize
  const resizeCanvas = () => {
    if (sigRef.current && sigContainerRef.current) {
      const container = sigContainerRef.current
      const canvas = sigRef.current.getCanvas()
      const ratio = Math.max(window.devicePixelRatio || 1, 1)

      // Get the actual width of the container
      const width = container.clientWidth
      const height = 200 // Fixed height

      // Set the actual canvas size
      canvas.width = width * ratio
      canvas.height = height * ratio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      // Scale the drawing context to match device pixel ratio
      const context = canvas.getContext('2d')
      context.scale(ratio, ratio)

      // Clear and reset the signature
      console.log('🔄 Canvas resized - signature cleared')
      sigRef.current.clear()
    }
  }
  
  // Resize canvas on mount and window resize
  useEffect(() => {
    // Initial resize
    setTimeout(resizeCanvas, 100)
    
    // Add resize listener
    window.addEventListener('resize', resizeCanvas)
    
    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  // Handle waiver content scroll
  const handleWaiverScroll = (e) => {
    const element = e.target;
    const scrollPercentage = (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;
    setScrollProgress(Math.min(scrollPercentage, 100));
    
    const scrolledToBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 5;
    if (scrolledToBottom || scrollPercentage >= 98) {
      setHasScrolledWaiver(true);
      setScrollProgress(100);
    }
  }

  // Handle checkbox change
  const handleAgreeChange = (checked) => {
    if (checked && !hasScrolledWaiver) {
      toast.error("You must review the entire waiver text before you can agree", {
        style: {
          background: 'rgb(249 115 22 / 0.9)', // orange-500 with opacity
          color: 'white',
          border: '1px solid rgb(249 115 22)',
        },
        duration: 4000,
      });
      // Scroll to the waiver section
      waiverContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setAgree(checked);
  }

  // Handle dependent functions
  const addDependent = () => {
    setDependents([...dependents, { 
      _id: generateObjectId(),
      name: "", 
      dob: "", 
      gender: "" 
    }]);
  }

  const updateDependent = (index, field, value) => {
    const updated = [...dependents];
    updated[index][field] = value;
    setDependents(updated);
  }

  const removeDependent = (index) => {
    setDependents(dependents.filter((_, i) => i !== index));
  }
  
  // State for dependent date pickers
  const [dependentDatePickerOpen, setDependentDatePickerOpen] = useState({})


  const [ customer, setCustomer ] = useState({name: "", nameParent: "", email: "", phone: "", dob: "", gender: "", signature: "", photo: ""})
  const [ address, setAddress ] = useState({
    address1: "",
    city: "",
    state: "",
    postcode: ""
  })
  const [ dependents, setDependents ] = useState([])
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
  }, [customer, address, hasScrolledWaiver, agree])

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
    waiverReviewed: z.literal(true),
    agree: z.literal(true),
    signature: z.string().min(100),
    photo: z.string().min(1, "Photo is required"),
  })
  
  // Check if all dependents have complete information
  const dependentsValid = dependents.every(dep =>
    dep.name && dep.name.trim() !== '' &&
    dep.gender && dep.gender.trim() !== '' &&
    dep.dob && dep.dob.trim() !== ''
  )

  const result = waiverSchema.safeParse({
    ...customer,
    ...address,
    waiverReviewed: hasScrolledWaiver,
    agree,
  })
  const isValid = result.success && dependentsValid

  // Debug logging for validation state
  console.log('🔍 Waiver Validation Debug:', {
    hasScrolledWaiver,
    agree,
    dependentsCount: dependents.length,
    dependentsValid,
    schemaValidation: result.success,
    schemaErrors: result.success ? null : result.error.issues,
    signatureLength: customer.signature?.length || 0,
    signaturePreview: customer.signature?.substring(0, 50) || 'empty',
    photoLength: customer.photo?.length || 0,
    photoPreview: customer.photo?.substring(0, 50) || 'empty',
    customer,
    address,
    isValid
  })

  const register = async () => {
    // Check if waiver has been reviewed before submitting
    if (!hasScrolledWaiver) {
      toast.error("Please review the entire waiver before submitting", {
        style: {
          background: 'rgb(249 115 22 / 0.9)', // orange-500 with opacity
          color: 'white',
          border: '1px solid rgb(249 115 22)',
        },
        duration: 4000,
      });
      // Scroll to the waiver section
      waiverContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    // Check if customer is 18 or older
    if (customer.dob) {
      const birthDate = new Date(customer.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 18) {
        toast.error("You must be 18 years or older to sign this waiver. Minors must be added as dependents under a parent or guardian.", {
          style: {
            background: 'rgb(239 68 68 / 0.9)', // red-500 with opacity
            color: 'white',
            border: '1px solid rgb(239 68 68)',
          },
          duration: 5000,
        });
        return;
      }
    }
    
    const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + "/api/unauth/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        ...customer, 
        ...address, 
        waiverReviewed: hasScrolledWaiver,
        agree, 
        org,
        dependents,
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
    setDependents([]);
    setHasScrolledWaiver(false);
    setScrollProgress(0);
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
            <Label>Portrait</Label>
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
                    className="justify-start"
                    onClick={() => setShowCamera(true)}
                  >
                    <Camera className="h-4 w-4" />
                    Take Photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
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
          <div className="space-y-">
            <div 
              ref={waiverContentRef}
              className={`p-4 border-2 rounded-lg bg-muted/30 max-h-60 overflow-y-auto max-w-none waiver-content ${
                !hasScrolledWaiver ? '' : ''
              }`}
              onScroll={handleWaiverScroll}
              dangerouslySetInnerHTML={{ __html: waiverContent }}
            />
            
            {/* Progress indicator */}
              <div className="space-y-2">
                <Progress 
                  value={scrollProgress} 
                  className={`h-2 mt-2 ${hasScrolledWaiver ? 'bg-green-100' : 'bg-orange-100'}`}
                />
                <div className="flex justify-between">
                  <div className="flex justfiy-center items-center gap-2">
                    <Checkbox 
                      checked={agree} 
                      onCheckedChange={handleAgreeChange}
                      disabled={!hasScrolledWaiver}
                    />
                    <div className={`text-sm ml-auto ${!hasScrolledWaiver ? 'text-destructive' : ''}`}>
                      {hasScrolledWaiver ? 'I agree to the terms and conditions' : 'Please scroll to review entire waiver'}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(scrollProgress)}%
                  </span>
                </div>
              </div>
            </div>



          <div className="flex flex-col gap-6 items-start *:min-w-72 mt-2">

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

          {/* Dependents Section */}
          <div className="flex flex-col gap-2 w-full mt-2">
            {dependents.length > 0 && (
              <>
                <Label>Dependents</Label>
                <div className="space-y-4">
                  {dependents.map((dependent, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-medium">Dependent {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDependent(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      
                      <div className="grid gap-4">
                        <div className="flex flex-col gap-2">
                          <Label>Name</Label>
                          <Input
                            type="text"
                            placeholder="Dependent name"
                            value={dependent.name}
                            onChange={(e) => updateDependent(index, 'name', e.target.value)}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <Label>Date of Birth</Label>
                            <Popover 
                              open={dependentDatePickerOpen[index] || false}
                              onOpenChange={(open) => {
                                setDependentDatePickerOpen(prev => ({...prev, [index]: open}))
                              }}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                                >
                                  {dependent.dob ? new Date(dependent.dob).toLocaleDateString() : "Select date"}
                                  <ChevronDownIcon className="ml-auto h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={dependent.dob ? new Date(dependent.dob) : undefined}
                                  captionLayout="dropdown"
                                  onSelect={(selectedDate) => {
                                    updateDependent(index, 'dob', selectedDate ? selectedDate.toISOString().slice(0, 10) : '');
                                    setDependentDatePickerOpen(prev => ({...prev, [index]: false}));
                                  }}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <Label>Gender</Label>
                            <Select 
                              value={dependent.gender} 
                              onValueChange={(value) => updateDependent(index, 'gender', value)}
                            >
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
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
            
            <Button
              type="button"
              onClick={addDependent}
              variant="outline"
              className="w-fit"
            >
              <Plus className="h-4 w-4" />
              Add Dependent
            </Button>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <Label>Signature</Label>
            <div 
              ref={sigContainerRef}
              className="relative w-full border border-card-foreground/20 rounded-lg bg-accent/50"
              style={{ height: '200px' }}
            >
              <SignatureCanvas
                ref={sigRef}
                penColor="white"
                canvasProps={{ 
                  style: { 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%'
                  }
                }}
                onEnd={() => getSig()}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clear}>Clear</Button>
            </div>
          </div>


          {errors.length > 0 && (
            <div className="text-sm bg-red-400/60 p-4 rounded-lg border border-red-500">
              {errors.map((err, i) => (
                <div key={i}>{err.error || err}</div>
              ))}
            </div>
          )}

          <Button 
            disabled={!isValid} 
            onClick={register}
            className={isValid ? "cursor-pointer" : ""}
          >
            Submit
          </Button>

        </CardContent>
      </Card>
    </div>
  )

}
