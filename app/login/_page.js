// 'use client'
// import { signIn } from "next-auth/react";
// import { redirect } from 'next/navigation'
// import { useState, useEffect } from "react";

// import { Button } from "@/components/ui/button"
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"

// export default function LoginForm() {
//   const [ error, setError ] = useState(false)
//   const [ email, setEmail ] = useState("")
//   const [ password, setPassword ] = useState("")

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const result = await signIn("credentials", { redirect: false, email, password });
//     console.log(result)
//     // setError(result?.error)

//     if (!result.error)
//       redirect('/dashboard')

//     // if (result?.error) {
//     //   // Redirect to error page with the error message
//     //   window.location.href = `/auth/signin?error=${result.error}`;
//     // }
//   };

//   return (
//     <div className="flex items-center justify-center mx-auto">
//       <div className="w-full max-w-sm">
//         <div className="flex flex-col gap-6">
//           <Card>
//             <CardHeader>
//               <CardTitle>Login to your account</CardTitle>
//               <CardDescription>
//                 Enter your email below to login to your account
//               </CardDescription>
//             </CardHeader>
//             <CardContent>
//               <form>
//                 <div className="flex flex-col gap-6">
//                   <div className="grid gap-3">
//                     <Label htmlFor="email">Email</Label>
//                     <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="m@example.com" required />
//                   </div>
//                   <div className="grid gap-3">
//                     <div className="flex items-center">
//                       <Label htmlFor="password">Password</Label>
//                       <a
//                         href="#"
//                         className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
//                         Forgot your password?
//                       </a>
//                     </div>
//                     <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
//                   </div>
//                   <div className="flex flex-col gap-3">
//                     <Button 
//                       type="submit" 
//                       className="w-full"
//                       onClick={handleSubmit}
//                     >
//                       Login
//                     </Button>

//                   </div>
//                 </div>
//                 <div className="mt-4 text-center text-sm">
//                   Don&apos;t have an account?{" "}
//                   <a href="#" className="underline underline-offset-4">
//                     Sign up
//                   </a>
//                 </div>
//               </form>
//             </CardContent>
//           </Card>
//         </div>
//       </div>
//     </div>
//   );
// }


// // "use client";

// // import { signIn } from "next-auth/react";
// // import { useSearchParams } from "next/navigation";
// // import { useState, useEffect } from "react";

// // export default function SignIn() {
// //   const searchParams = useSearchParams();
// //   // const error = searchParams.get("error");
// //   const [ error, setError ] = useState(false)

// //   const [errorMessage, setErrorMessage] = useState("");

// //   useEffect(() => {
// //     if (error) {
// //       switch (error) {
// //         case "CredentialsSignin":
// //           setErrorMessage("Invalid username or password. Please try again.");
// //           break;
// //         case "AccessDenied":
// //           setErrorMessage("You do not have permission to sign in.");
// //           break;
// //         default:
// //           setErrorMessage("An unknown error occurred. Please try again.");
// //       }
// //     }
// //   }, [error]);

// //   const handleSubmit = async (e) => {
// //     e.preventDefault();
// //     const result = await signIn("credentials", { redirect: false, username: "test1", password: "password" });
// //     // console.log(result)
// //     setError(result?.error)

// //     // if (result?.error) {
// //     //   // Redirect to error page with the error message
// //     //   window.location.href = `/auth/signin?error=${result.error}`;
// //     // }
// //   };

// //   return (
// //     <div className="p-10">

// //       <fieldset className="fieldset w-xs bg-base-200 border border-base-300 p-4 rounded-box">
// //         <legend className="fieldset-legend">Login</legend>
        
// //         <label className="fieldset-label">Email</label>
// //         <input type="email" className="input" placeholder="Email" />
        
// //         <label className="fieldset-label">Password</label>
// //         <input type="password" className="input" placeholder="Password" />
        
// //         <button className="btn btn-neutral mt-4">Login</button>
// //       </fieldset>
// //     </div>
// //   );
// // }