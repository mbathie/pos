import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getEmployee } from "@/lib/auth";

export async function GET() {
  const { employee, error, status } = await getEmployee()

  if (error)
    return NextResponse.json({ error }, { status })

  const locations = await prisma.location.findMany({
    where: { orgId: employee.org.id },
    select: { id: true, name: true }
  })

  return NextResponse.json(locations, { status: 200 });

}