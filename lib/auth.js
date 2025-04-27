import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import prisma from "@/lib/db"

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET)

export async function getEmployee() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")

    if (!token) {
      return { error: "Unauthorized", status: 401 }
    }

    const { payload } = await jwtVerify(token.value, SECRET_KEY)

    const employee = await prisma.employee.findUnique({
      where: { id: payload.employeeId },
      include: { org: true },
      omit: { createdAt: true, deletedAt: true, updatedAt: true, hash: true }
    })

    if (!employee)
      return { error: "User not found", status: 404 }

    return { employee, status: 200 };
  } catch (error) {
    console.error(error);
    return { error: "Internal Server Error", status: 500 };
  }
}