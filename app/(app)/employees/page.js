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

import { Plus, Pencil } from "lucide-react"
import { useEffect, useState } from "react"

import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
dayjs.extend(relativeTime)

export default function Page () {
  const [ employees, setEmployees ] = useState([])
  const [ locations, setLocations ] = useState([])
  const [ dialogOpen, setDialogOpen ] = useState(null)
  const [ newEmployee, setNewEmployee ] = useState({})

  useEffect(() => {
    async function start() {
      const res = await fetch(`/api/employees`, { method: "GET" })
      setEmployees(await res.json())

      const lres = await fetch(`/api/locations`, { method: "GET" })
      setLocations(await lres.json())
    }
    start()
  },[])

  // const handleEmployee = async () => {
  //   // console.log(employee)
  //   if (employee.new) {
  //     const res = await fetch(`/api/employees`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({locationId: employee.location.id, name: employee.name, role: employee.role, email: employee.email}),
  //     })
  //     const e = await res.json()
  //     setEmployees([e, ...employees])
  //   }
  //   else if (employee.edit) {
  //     const res = await fetch(`/api/employees/${employee.id}`, {
  //       method: "PUT",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({locationId: employee.location.id, name: employee.name, role: employee.role, email: employee.email}),
  //     })
  //   }
  // }

  // <TableCell>
  // <Button 
  //   variant="outline" size="sm"
  //   onClick={() => {
  //     setDialogOpen(i)
  //     // setEmployee({...e, edit: true, role: e.role.toLowerCase()})
  //   }}
  // >
  //   <Pencil className="size-4" />
  // </Button>

  // <Employee 
  //   e={e}
  //   isOpen={dialogOpen === i}
  //   setIsOpen={() => setDialogOpen(null)}
  //   locations={locations}
  //   employees={employees}
  //   setEmployees={setEmployees}
  // />

// </TableCell>

  return (
    <div>
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
              locations={locations}
              employees={employees}
              setEmployees={setEmployees}
            />
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Default Location</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>

              {employees.map((e, i) => {
                return (
                  <React.Fragment key={i}>
                    <TableRow className={`${e.password ? 'border-b-0' : ''}`}>
                      <TableCell>{e.email}</TableCell>
                      <TableCell>{e.name}</TableCell>
                      <TableCell>{e.location.name}</TableCell>
                      <TableCell>{e.role}</TableCell>
                      <TableCell>{dayjs(e.updatedAt).fromNow()}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" size="sm"
                          onClick={() => {
                            setDialogOpen(i)
                            // setEmployee({...e, edit: true, role: e.role.toLowerCase()})
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>

                        <Employee 
                          e={e}
                          isOpen={dialogOpen === i}
                          setIsOpen={() => setDialogOpen(null)}
                          locations={locations}
                          employees={employees}
                          setEmployees={setEmployees}
                        />

                      </TableCell>
                    </TableRow>
                    {e.password &&
                      <TableRow>
                        <TableCell colSpan="6" className="ml-2 pt-0 text-xs text-gray-500">temp password: {e.password}</TableCell>
                      </TableRow>
                    }
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

export function Employee ({ e, employees, setEmployees, isOpen, setIsOpen, locations }) {
  const [ employee, setEmployee ] = useState({})
  const [ isValid, setIsValid ] = useState(false)

  const employeeSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1, "Name is required"),
    role: z.enum(["ADMIN", "MANAGER", "STAFF", "TERMINAL"]),
    location: z.object({
      id: z.number().int().positive("Location ID must be a positive integer"),
    }),
  });

  useEffect(() => {
    console.log(employee)
    setIsValid(employeeSchema.safeParse(employee).success);
    console.log(employeeSchema.safeParse(employee).error)
  }, [employee])

  useEffect(() => {
    setEmployee(e || { email: "", name: "", role: "", location: {} })
  }, [e])

  const update = async () => {
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({locationId: employee.location.id, name: employee.name, role: employee.role, email: employee.email}),
    })
    const _e = await res.json()
    setEmployees(employees.map(emp => emp.id === _e.id ? _e : emp))
    setIsOpen(false)
  }
  const create = async () => {
    const res = await fetch(`/api/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({locationId: employee.location.id, name: employee.name, role: employee.role, email: employee.email}),
    })    
    const _e = await res.json()
    setEmployees([_e, ...employees])
    setIsOpen(false)

  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* <DialogTrigger>Open</DialogTrigger> */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Employee</DialogTitle>
          <DialogDescription>
            {employee.email}, {employee.name}
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
          <Label htmlFor="location">Location</Label>
          <Select id="location" value={employee?.location?.name} 
            onValueChange={(value) => {
              setEmployee({ ...employee, location: locations.find(l => l.name === value) })
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {locations.map((l) => {
                  return (
                    <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                  )
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="roles">Location</Label>

          <Select id="roles" value={employee.role} onValueChange={(value) => setEmployee({ ...employee, role: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Roles</SelectLabel>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="STAFF">Staff</SelectItem>
                <SelectItem value="TERMINAL">Terminal</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <Button 
          className={`${employeeSchema.safeParse(employee).success ? '' : ''} max-w-sm`}
          disabled={!isValid}
          onClick={() => e.new ? create() : update()}
        >
          {e.new &&
            <>Create User</>
          }
          {!e.new &&
            <>Save User</>
          }

        </Button>

      </DialogContent>
    </Dialog>
  )
}