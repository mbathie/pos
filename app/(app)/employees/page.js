'use client'
import React from 'react'
import { z } from "zod";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Plus, Pencil, Loader, Send, Ellipsis, Lock, Unlock } from "lucide-react"
import { useEffect, useState } from "react"

import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { checkApiResponse } from "@/lib/client-auth"
import permissionsConfig from "@/lib/permissions.json"
dayjs.extend(relativeTime)

export default function Page () {
  const [ employees, setEmployees ] = useState([])
  const [ dialogOpen, setDialogOpen ] = useState(null)
  const [ newEmployee, setNewEmployee ] = useState({})
  const [ actionLoading, setActionLoading ] = useState({})

  useEffect(() => {
    async function start() {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/employees`, { method: "GET" })
      setEmployees(await res.json())
    }
    start()
  },[])

  const handleResendEmail = async (employeeId) => {
    setActionLoading(prev => ({...prev, [`resend-${employeeId}`]: true}))
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/employees/${employeeId}/resend-email`, {
        method: "POST",
      })
      checkApiResponse(res) // Check for locked account
      const result = await res.json()
      if (result.success) {
        console.log('Email sent successfully:', result.previewUrl)
        // Show success message or toast
      } else {
        console.error('Failed to send email:', result.error)
      }
    } catch (error) {
      console.error('Error re-sending email:', error)
    } finally {
      setActionLoading(prev => ({...prev, [`resend-${employeeId}`]: false}))
    }
  }

  const handleLockUnlock = async (employeeId, action) => {
    setActionLoading(prev => ({...prev, [`lock-${employeeId}`]: true}))
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/employees/${employeeId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      })
      checkApiResponse(res) // Check for locked account
      const result = await res.json()
      if (result.success) {
        // Update the employee in the list
        setEmployees(employees.map(emp => {
          const empId = emp._id || emp.id
          if (empId === employeeId) {
            return {
              ...emp,
              locked: action === 'lock' ? new Date().toISOString() : null
            }
          }
          return emp
        }))
      } else {
        console.error('Failed to update lock status:', result.error)
      }
    } catch (error) {
      console.error('Error updating lock status:', error)
    } finally {
      setActionLoading(prev => ({...prev, [`lock-${employeeId}`]: false}))
    }
  }


  return (
    <div className='px-4'>
      <Card>
        <CardHeader>
          <CardTitle className="flex">
            Employees
            <div className="flex-1" />
            <Button onClick={() => {
              setNewEmployee({ email: "", name: "", role: "", new: true })
            }}>
              New
            </Button>

            <Employee 
              e={newEmployee}
              isOpen={newEmployee.new}
              setIsOpen={() => setNewEmployee({...newEmployee, new: false})}
              employees={employees}
              setEmployees={setEmployees}
            />
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted rounded-tl-lg">Email</TableHead>
                <TableHead className="bg-muted">Name</TableHead>
                <TableHead className="bg-muted">Role</TableHead>
                <TableHead className="bg-muted">Last Activity</TableHead>
                <TableHead className="bg-muted rounded-tr-lg"></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>

              {employees.map((e, i) => {
                return (
                  <React.Fragment key={i}>
                    <TableRow>
                      <TableCell className="flex items-center gap-2">
                        {e.email}
                        {e.locked && <Lock className="size-4 text-destructive" />}
                      </TableCell>
                      <TableCell>{e.name}</TableCell>
                      <TableCell>{e.role}</TableCell>
                      <TableCell>{dayjs(e.updatedAt).fromNow()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <Ellipsis className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDialogOpen(i)}>
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleResendEmail(e._id || e.id)}
                              disabled={actionLoading[`resend-${e._id || e.id}`]}
                            >
                              {actionLoading[`resend-${e._id || e.id}`] ? (
                                <Loader className="size-4 mr-2 animate-spin" />
                              ) : (
                                <Send className="size-4" />
                              )}
                              Reset pass & pin
                            </DropdownMenuItem>
                            {e.locked ? (
                              <DropdownMenuItem 
                                onClick={() => handleLockUnlock(e._id || e.id, 'unlock')}
                                disabled={actionLoading[`lock-${e._id || e.id}`]}
                              >
                                {actionLoading[`lock-${e._id || e.id}`] ? (
                                  <Loader className="size-4 mr-2 animate-spin" />
                                ) : (
                                  <Unlock className="size-4" />
                                )}
                                Unlock account
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => handleLockUnlock(e._id || e.id, 'lock')}
                                disabled={actionLoading[`lock-${e._id || e.id}`]}
                              >
                                {actionLoading[`lock-${e._id || e.id}`] ? (
                                  <Loader className="size-4 mr-2 animate-spin" />
                                ) : (
                                  <Lock className="size-4" />
                                )}
                                Lock account
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Employee 
                          e={e}
                          isOpen={dialogOpen === i}
                          setIsOpen={() => setDialogOpen(null)}
                          employees={employees}
                          setEmployees={setEmployees}
                        />

                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export function Employee ({ e, employees, setEmployees, isOpen, setIsOpen }) {
  const [ employee, setEmployee ] = useState({})
  const [ isValid, setIsValid ] = useState(false)
  const [ isLoading, setIsLoading ] = useState(false)

  // Get available roles from permissions config
  const availableRoles = Object.keys(permissionsConfig.roles);

  const employeeSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1, "Name is required"),
    role: z.enum(availableRoles), // Use roles from permissions file
  });

  useEffect(() => {
    console.log('Employee state:', JSON.stringify(employee, null, 2));
    const validationResult = employeeSchema.safeParse(employee);
    setIsValid(validationResult.success);
    if (!validationResult.success) {
      console.log('Validation errors:', validationResult.error.issues);
      console.log('Validation failed for:', {
        email: employee.email,
        name: employee.name, 
        role: employee.role,
      });
    } else {
      console.log('Validation passed for employee:', employee.email || 'new employee');
    }
  }, [employee])

  useEffect(() => {
    const baseEmployee = { 
      email: "", 
      name: "", 
      role: "", 
      new: false,
    };

    if (e) {
      // For existing employees
      const processedEmployee = {
        ...baseEmployee,
        ...e,
        id: e._id || e.id, // Ensure employee has id field for API calls
      };
      setEmployee(processedEmployee);
    } else {
      setEmployee(baseEmployee);
    }
  }, [e])

  const update = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/employees/${employee.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({name: employee.name, role: employee.role, email: employee.email}),
    })
    const _e = await res.json()
    // Update the specific employee in the list without refetching
    setEmployees(employees.map(emp => {
      const empId = emp._id || emp.id;
      const updatedId = _e._id || _e.id;
      return empId === updatedId ? _e : emp;
    }))
    setIsOpen(false)
  }
  const create = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({name: employee.name, role: employee.role, email: employee.email}),
      })    
      const _e = await res.json()
      setEmployees([_e, ...employees])
      setIsOpen(false)
    } catch (error) {
      console.error('Error creating employee:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* <DialogTrigger>Open</DialogTrigger> */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{employee.new ? 'New Employee' : 'Update Employee'}</DialogTitle>
          <DialogDescription>
            {employee.new ? 'Create a new employee account' : `${employee.email}, ${employee.name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input 
            type="email" 
            id="email"
            placeholder="m@myco.com"
            value={employee.email} 
            onChange={(x) => setEmployee({ ...employee, email: x.target.value })} 
          />
        </div>

        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input 
            type="text" 
            id="name"
            placeholder="Mark"
            value={employee.name} 
            onChange={(x) => setEmployee({ ...employee, name: x.target.value })} 
          />
        </div>

        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="roles">Role</Label>

          <Select id="roles" value={employee.role} onValueChange={(value) => setEmployee({ ...employee, role: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Roles</SelectLabel>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <Button 
          className={`${employeeSchema.safeParse(employee).success ? '' : ''} max-w-sm`}
          disabled={!isValid || isLoading}
          onClick={() => employee.new ? create() : update()}
        >
          {employee.new && (
            <>
              {isLoading ? (
                <>
                  <Loader className="size-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>Create Employee</>
              )}
            </>
          )}
          {!employee.new &&
            <>Save Employee</>
          }

        </Button>

      </DialogContent>
    </Dialog>
  )
}