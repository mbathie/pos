// import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Roboto_Mono } from "next/font/google";
import { GlobalProvider } from "@/components/global-context";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider"

const roboto = Roboto_Mono({ subsets: ['latin'] })

export const metadata = {
  title: "POS Management dash",
  description: "POS Terminal dash",
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const cookieString = allCookies.map(
    (cookie) => `${cookie.name}=${cookie.value}`
  ).join("; ");

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/me`, {
    method: "GET",
    headers: {
      Cookie: cookieString,
    },
  });
  const data = await res.json();
  console.log(data)

  return (
    <html lang="en">
      <body className={`${roboto.className} antialiased`}>
        <ThemeProvider> {/* ✅ This should now work correctly */}
          <GlobalProvider initEmployee={data.employee}>{children}</GlobalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}