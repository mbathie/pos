// import { NextResponse } from "next/server"
// import prisma from "@/lib/db"

// export async function PUT(req, { params }) {
//   try {

//     const { id } = await params
//     const body = await req.json()
//     const { name, email, locationId, role } = body

//     if (!name || !email || !locationId)
//       return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

//     const newEmployee = await prisma.employee.update({
//       where: { id: parseInt(id) },
//       data: { name, email, locationId, role },
//       omit: { hash: true },
//       include: { location: true }
//     })

//     return NextResponse.json({...newEmployee}, { status: 201 })
//   } catch (error) {
//     console.error(error)
//     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
//   }
// }