import "./globals.css";
import { Roboto_Mono } from "next/font/google";
import { GlobalProvider } from "@/components/global-context";
import { ThemeProvider } from "@/components/theme-provider"

const roboto = Roboto_Mono({ subsets: ['latin'] })

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
      <body className={`${roboto.className} antialiased-`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        > 
          <GlobalProvider >{children}</GlobalProvider>

        </ThemeProvider>
      </body>
    </html>
  )
}