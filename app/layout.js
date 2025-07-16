import "./globals.css";
import { Geist } from "next/font/google";
import { GlobalProvider } from "@/components/global-context";
import { ThemeProvider } from "@/components/theme-provider"

const geist = Geist({ subsets: ['latin'] })

export const metadata = {
  title: "Cultcha Lifestyle Management",
  description: "All-in-one POS platform for fitness centers, entertainment, and dining experiences",
};

export default async function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={`${geist.className} antialiased`}>
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