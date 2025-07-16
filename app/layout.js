import "./globals.css";
import { Inter } from "next/font/google";
import { GlobalProvider } from "@/components/global-context";
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: "Cultcha Management dash",
  description: "Cultcha Terminal dash",
};

export default async function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        > 
          <GlobalProvider>{children}</GlobalProvider>

        </ThemeProvider>
      </body>
    </html>
  )
}