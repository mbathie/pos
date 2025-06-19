import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_API_BASE_URL}/`); // Use an absolute URL
    response.cookies.set("token", "", { httpOnly: true, secure: true, expires: new Date(0) });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}