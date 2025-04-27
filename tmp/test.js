function updateProduct(products, productIndex, { vIdx, vvIdx, pIdx, path }, field, newValue) {
  // Get the product by index
  const product = products[productIndex];
  if (!product) {
    console.log("Product not found");
    return;
  }

  // Handling the 'prices' path
  if (path === "prices") {
    if (pIdx === -1) {
      // Insert a new price if pIdx is -1
      product.prices.push({ [field]: newValue });
    } else if (product.prices[pIdx]) {
      product.prices[pIdx][field] = newValue;
    }
  } 
  // Handling the 'variations' path
  else if (path === "variations") {
    const variation = product.variations;

    if (vIdx === -1) {
      // Insert a new variation if vIdx is -1
      variation.push({ [field]: newValue, variants: [] }); // Initialize variants array
    } else if (variation[vIdx]) {
      // If variation exists and vvIdx is specified, update variant
      const variant = variation[vIdx].variants;
      if (vvIdx === -1) {
        // Insert a new variant if vvIdx is -1
        variant.push({ [field]: newValue });
      } else if (variant[vvIdx]) {
        // Update the specified variant's field
        variant[vvIdx][field] = newValue;
      }
    }
  }
}

// Example usage:

const products = [
  {
    "id": 1,
    "name": "Product1",
    "prices": [
      {
        "name": "Standard",
        "price": "10"
      }
    ],
    "variations": [
      {
        "name": "Color",
        "variants": [
          {
            "name": "Red",
            "price": "12"
          }
        ]
      }
    ]
  },
  {
    "id": 2,
    "name": "Product2",
    "prices": [
      {
        "name": "Standard",
        "price": "20"
      }
    ],
    "variations": [
      {
        "name": "Size",
        "variants": [
          {
            "name": "Medium",
            "price": "18"
          }
        ]
      }
    ]
  }
];

// Update the variant's name for Product1 (index 0), Color variation (index 0), Red variant (index 0)
updateProductDataByIndex(products, 0, { path: 'variations', vIdx: 0, vvIdx: 0 }, 'name', 'Red1');
console.log(products[0].variations[0].variants[0].name); // Should print 'Red1'

// Update the variation's name for Product1 (index 0), Color variation (index 0)
updateProductDataByIndex(products, 0, { path: 'variations', vIdx: 0 }, 'name', 'Color1');
console.log(products[0].variations[0].name); // Should print 'Color1'

// Test adding new variations and variants for Product2 (index 1)
updateProductDataByIndex(products, 1, { path: 'variations', vIdx: -1 }, 'name', 'Material');
updateProductDataByIndex(products, 1, { path: 'variations', vIdx: 1, vvIdx: -1 }, 'name', 'Large');
updateProductDataByIndex(products, 1, { path: 'variations', vIdx: 1, vvIdx: 0 }, 'price', '25');

// Add a new price for Product2 (index 1)
// updateProductDataByIndex(products, 1, { path: 'prices', pIdx: -1 }, 'name', 'Premium');
// updateProductDataByIndex(products, 1, { path: 'prices', pIdx: 1 }, 'price', '50');

console.log(JSON.stringify(products, null, 2));