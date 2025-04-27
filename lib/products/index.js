import prisma from "@/lib/db"

// get all products for a given categoryId, and include all 
// variants/variations in all products per category.
// so if product x has variation y, producy a should also have variation y
// included, except its status wouldn't be enabled
export async function getProducts({categoryId, productId}) {

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      products: {
        where: {
          deletedAt: null,
          ...(productId ? { id: productId } : {}),
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          prices: {
            where: {
              deletedAt: null
            }
          },
          variants: {
            include: {
              variant: {
                include: {
                  variation: true,
                },
              },
            },
          },
        },
      },
      variations: {
        include: {
          variants: true,
        },
      },
    },
  });

  console.log(category.variations)

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  // Build a base variation -> variants map with enabled=false
  const variationMap = category.variations.reduce((acc, variation) => {
    acc[variation.id] = variation.variants.map((v) => ({
      id: v.id,
      name: v.name,
      amount: v.amount ?? null, // ✅ assign here early
      enabled: false,
    }));
    return acc;
  }, {});

  const products = category.products.map((product) => {
    // Clone the variationMap per product to avoid mutation
    const productVariations = {};
  
    for (const [variationId, variants] of Object.entries(variationMap)) {
      const variationName = category.variations.find(v => v.id === parseInt(variationId))?.name || "";
      const clonedVariants = variants.map((v) => ({ ...v }));
  
      productVariations[variationId] = {
        id: parseInt(variationId),
        name: variationName,
        variants: clonedVariants,
        enabled: false,
      };
    }
  
    // Enable variants that are assigned to this product
    product.variants.forEach(({ variant, enabled }) => {
      const variation = productVariations[variant.variationId]
      if (variation) {
        const match = variation.variants.find((v) => v.id === variant.id)
        if (match) {
          match.enabled = enabled;
          match.amount = variant.amount ?? null
        }
      }
    });
  
    // Enable variations that have any enabled variants
    for (const variation of Object.values(productVariations)) {      
      variation.enabled = variation.variants.some((v) => v.enabled);
    }
  
    return {
      data: product.data,
      id: product.id,
      name: product.name,
      categoryId: category.id, // ← Add this line
      variations: Object.values(productVariations),
      prices: product.prices || [],
    };
  });

  // Return one product if productId was specified
  if (productId) {
    const singleProduct = products[0];
    return singleProduct
  }

  return products
}