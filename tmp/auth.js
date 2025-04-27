export const runtime = "nodejs";

import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from '@/lib/db'
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password)
          throw new Error("Missing email or password")

        const user = await prisma.employee.findUnique({
          where: { email: credentials.email },
        })

        if (!user)
          throw new Error("Invalid credentials")

        const isValid = await bcrypt.compare(credentials.password, user.hash)
        
        console.log(isValid)

        if (!isValid)
          throw new Error("Invalid credentials")



        return { id: user.id, name: user.name, email: user.email }
        // if (credentials.username === "test" && credentials.password === "password") {
        //   return { id: "1", name: "Test User", email: "test@example.com" };
        // }
        // return null; // Avoid throwing error here for debugging
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
})