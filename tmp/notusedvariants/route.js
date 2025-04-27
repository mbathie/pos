// import { NextResponse } from "next/server";
// import prisma from "@/lib/db";

// export async function GET(req, { params }) {
//   try {
//     const { id } = await params

//     if (isNaN(id)) {
//       return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
//     }

//     const variants = await prisma.variant.findMany({
//       where: {
//         catProdVarVar: {
//           some: { categoryId: parseInt(id) },
//         },
//       },  
//     })

//     return NextResponse.json(variants, { status: 200 });
//   } catch (error) {
//     console.error(error);
//     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
//   }
// }