'use client'

import React, { useState, useRef, useEffect } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '@/components/ui/select'
import SignatureCanvas from 'react-signature-canvas'
import { Calendar } from '@/components/ui/calendar';
import { ChevronDownIcon, Camera, Upload, User, X, Plus, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from "sonner";
import { generateObjectId } from '@/lib/utils';

function DateOfBirthPicker({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(value ? new Date(value) : undefined);
  const userLocale = typeof window !== 'undefined' && navigator.language ? navigator.language : 'en-AU';

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

/**
 * Reusable waiver form component
 * @param {Object} props
 * @param {Object} props.org - Organization object with name and waiverContent
 * @param {Function} props.onSubmit - Async function called on form submission. Receives { customer, address, dependents, hasScrolledWaiver, agree }
 * @param {Function} props.onSuccess - Function called after successful submission
 * @param {string} props.waiverCssClass - Optional CSS class for waiver styling
 */
export function WaiverForm({ org, onSubmit, onSuccess, waiverCssClass = '' }) {
  const [waiverContent, setWaiverContent] = useState('')
  const [hasScrolledWaiver, setHasScrolledWaiver] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const waiverContentRef = useRef(null)

  useEffect(() => {
    if (org?.waiverContent) {
      setWaiverContent(org.waiverContent)
    } else {
      setWaiverContent(getDefaultWaiverContent())
    }
  }, [org])

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
    sigRef.current.clear()
    setCustomer({...customer, signature: ""})
  }

  const getSig = () => {
    if (!sigRef.current) return

    const canvas = sigRef.current.getCanvas()
    if (!canvas) return

    const dataURL = canvas.toDataURL('image/png')
    setCustomer({...customer, signature: dataURL})
  }

  // Handle signature canvas resize
  const resizeCanvas = () => {
    if (sigRef.current && sigContainerRef.current) {
      const container = sigContainerRef.current
      const canvas = sigRef.current.getCanvas()
      const ratio = Math.max(window.devicePixelRatio || 1, 1)

      const width = container.clientWidth
      const height = 200

      canvas.width = width * ratio
      canvas.height = height * ratio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      const context = canvas.getContext('2d')
      context.scale(ratio, ratio)

      sigRef.current.clear()
    }
  }

  useEffect(() => {
    setTimeout(resizeCanvas, 100)
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

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

  const handleAgreeChange = (checked) => {
    if (checked && !hasScrolledWaiver) {
      toast.error("You must review the entire waiver text before you can agree", {
        style: {
          background: 'rgb(249 115 22 / 0.9)',
          color: 'white',
          border: '1px solid rgb(249 115 22)',
        },
        duration: 4000,
      });
      waiverContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setAgree(checked);
  }

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

  const [dependentDatePickerOpen, setDependentDatePickerOpen] = useState({})
  const [customer, setCustomer] = useState({name: "", nameParent: "", email: "", phone: "", dob: "", gender: "", signature: "", photo: ""})
  const [address, setAddress] = useState({
    address1: "",
    city: "",
    state: "",
    postcode: ""
  })
  const [dependents, setDependents] = useState([])
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState([])
  const [showCamera, setShowCamera] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    setErrors([])
  }, [customer, address, hasScrolledWaiver, agree])

  useEffect(() => {
    if (showCamera) {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
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

  const handleSubmit = async () => {
    if (!hasScrolledWaiver) {
      toast.error("Please review the entire waiver before submitting", {
        style: {
          background: 'rgb(249 115 22 / 0.9)',
          color: 'white',
          border: '1px solid rgb(249 115 22)',
        },
        duration: 4000,
      });
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
            background: 'rgb(239 68 68 / 0.9)',
            color: 'white',
            border: '1px solid rgb(239 68 68)',
          },
          duration: 5000,
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        customer,
        address,
        dependents,
        waiverReviewed: hasScrolledWaiver,
        agree,
        org
      });

      // Reset form
      setCustomer({ name: "", email: "", phone: "", signature: "", nameParent: "", photo: "", dob: "", gender: "" });
      setAddress({ address1: "", city: "", state: "", postcode: "" });
      setDependents([]);
      setHasScrolledWaiver(false);
      setScrollProgress(0);
      setAgree(false);
      setErrors([]);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      if (error.field) {
        setErrors([{ error: error.message || "An error occurred", field: error.field }]);
      } else {
        setErrors([{ error: error.message || "An error occurred" }]);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
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
                    className="absolute -top-3 -right-3 h-6 w-6 z-10 opacity-100 cursor-pointer"
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
                  className="justify-start cursor-pointer"
                  onClick={() => setShowCamera(true)}
                >
                  <Camera className="h-4 w-4" />
                  Take Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start cursor-pointer"
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
                  className="cursor-pointer"
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
                  className="flex-1 cursor-pointer"
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
                  className="cursor-pointer"
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

        {/* Waiver Content */}
        <div className="space-y-">
          <div
            ref={waiverContentRef}
            className={`p-4 border-2 rounded-lg bg-muted/30 max-h-60 overflow-y-auto max-w-none ${waiverCssClass}`}
            onScroll={handleWaiverScroll}
            dangerouslySetInnerHTML={{ __html: waiverContent }}
          />

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

        {/* Customer Details */}
        <div className="flex flex-col gap-6 items-start *:min-w-72 mt-2">
          <div className="flex gap-4 w-full">
            <div className="flex flex-col gap-2 w-full">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Name"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                className={errors[0]?.field === "email" ? "border-red-500" : ""}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 md:w-1/2 w-full md:pr-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
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
              <Label htmlFor="gender">Gender</Label>
              <Select value={customer.gender} onValueChange={(value) => setCustomer({ ...customer, gender: value })}>
                <SelectTrigger id="gender" className="w-full">
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
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              type="text"
              placeholder="Address Line 1"
              value={address.address1 || ""}
              onChange={(e) => setAddress({ ...address, address1: e.target.value })}
            />
          </div>

          <div className="flex w-full gap-4">
            <div className="flex flex-col gap-2 w-1/2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                type="text"
                placeholder="City"
                value={address.city || ""}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <Label htmlFor="state">State</Label>
              <Select value={address.state || ""} onValueChange={(value) => setAddress({ ...address, state: value })}>
                <SelectTrigger id="state" className="w-full">
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
          </div>

          <div className="flex flex-col gap-2 md:w-1/2 md:pr-2 w-full">
            <Label htmlFor="postcode">Postcode</Label>
            <Input
              id="postcode"
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
                        className="cursor-pointer"
                        onClick={() => removeDependent(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`dependent-name-${index}`}>Name</Label>
                        <Input
                          id={`dependent-name-${index}`}
                          type="text"
                          placeholder="Dependent name"
                          value={dependent.name}
                          onChange={(e) => updateDependent(index, 'name', e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <Label htmlFor={`dependent-dob-${index}`}>Date of Birth</Label>
                          <Popover
                            open={dependentDatePickerOpen[index] || false}
                            onOpenChange={(open) => {
                              setDependentDatePickerOpen(prev => ({...prev, [index]: open}))
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                id={`dependent-dob-${index}`}
                                variant="outline"
                                className="w-full justify-start text-left font-normal cursor-pointer"
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
                          <Label htmlFor={`dependent-gender-${index}`}>Gender</Label>
                          <Select
                            value={dependent.gender}
                            onValueChange={(value) => updateDependent(index, 'gender', value)}
                          >
                            <SelectTrigger id={`dependent-gender-${index}`} className="w-full">
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
            className="w-fit cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Dependent
          </Button>
        </div>

        {/* Signature */}
        <div className="flex flex-col gap-2 mt-2">
          <Label htmlFor="signature">Signature</Label>
          <div
            id="signature"
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
            <Button variant="outline" className="cursor-pointer" onClick={clear}>Clear</Button>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="text-sm bg-red-400/60 p-4 rounded-lg border border-red-500">
            {errors.map((err, i) => (
              <div key={i}>{err.error || err}</div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        <Button
          disabled={!isValid || isSubmitting}
          onClick={handleSubmit}
          className={isValid && !isSubmitting ? "cursor-pointer" : ""}
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>

      </CardContent>
    </Card>
  )
}
