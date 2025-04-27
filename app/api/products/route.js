import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getEmployee } from "@/lib/auth";

export async function GET(req, { params }) {
  const { employee } = await getEmployee();
  const orgId = employee.orgId;

  try {
    // Fetch all products that belong to a category from this org
    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        category: {
          orgId: orgId,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        locations: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Fetch all locations for this org
    const locations = await prisma.location.findMany({
      where: {
        orgId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Group products by categories for better processing
    const categoryMap = new Map();

    // Populate categoryMap with product data
    products.forEach((product) => {
      const enabledMap = new Map();
      product.locations.forEach((pl) => {
        enabledMap.set(pl.locationId, pl.enabled);
      });

      // Create the structure for the product
      const productData = {
        productId: product.id,
        productName: product.name,
        data: product.data, // ⬅️ Include product.data here
        enabled: enabledMap,
      };

      // Add product data to the category map
      if (!categoryMap.has(product.category.id)) {
        categoryMap.set(product.category.id, {
          categoryId: product.category.id,
          categoryName: product.category.name,
          products: [],
        });
      }

      categoryMap.get(product.category.id).products.push(productData);
    });

    // Prepare the result with counts and products per location and category
    const result = Array.from(categoryMap.values()).map((category) => {
      const categoryLocationCounts = locations.map((loc) => {
        let enabledCount = 0;
        let totalCount = 0;
        const productList = [];

        category.products.forEach((product) => {
          const enabled = product.enabled.get(loc.id) ?? false;
          if (enabled !== undefined) {
            totalCount += 1;
            if (enabled) enabledCount += 1;

            // Include product details for this location
            productList.push({
              productId: product.productId,
              productName: product.productName,
              data: product.data, // ⬅️ Include product.data here too
              enabled: enabled,
            });
          }
        });

        return {
          locationId: loc.id,
          locationName: loc.name,
          enabledCount,
          totalCount,
          products: productList,
        };
      });

      return {
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        locationCounts: categoryLocationCounts,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET_ORG_PRODUCTS]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}