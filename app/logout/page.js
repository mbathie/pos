"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginForm() {
  const router = useRouter();

  useEffect(() => {
    async function start() {
      console.log("Logging out...");
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        window.location.href = "/login"
      } else {
        console.error("Logout failed");
      }
    }

    start(); // Call the function once when the component mounts
  }, [router]); // Dependency array to avoid unnecessary re-renders

  return <div />;
}