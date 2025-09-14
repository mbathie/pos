/**
 * Seed Products
 * Creates categories and products with mod groups
 */

const seedData = require('./seed-data.json');
const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

/**
 * Create a category (or get existing one)
 */
async function createCategory(token, key, categoryData) {
  // First check if category exists
  const checkResponse = await fetch(`${API_BASE}/api/categories`, {
    headers: {
      'Cookie': `token=${token}`
    }
  });
  
  if (checkResponse.ok) {
    const response = await checkResponse.json();
    const categories = response.categories || response;
    if (Array.isArray(categories)) {
      const existing = categories.find(c => c.name === categoryData.name);
      if (existing) {
        console.log(`      Using existing category: ${categoryData.name}`);
        return existing;
      }
    }
  }
  
  // Create new category if it doesn't exist
  const response = await fetch(`${API_BASE}/api/categories/${key}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${token}`
    },
    body: JSON.stringify({
      name: categoryData.name,
      menu: 'shop',  // Set menu field for category
      icon: categoryData.icon,
      color: categoryData.color,
      thumbnail: categoryData.thumbnail
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create category ${categoryData.name}: ${error}`);
  }

  const result = await response.json();
  return result.category;
}

/**
 * Create a product with mod groups (or get existing one)
 */
async function createProduct(token, categoryId, productData, modGroupIds, folderId) {
  // First check if product exists
  const checkResponse = await fetch(`${API_BASE}/api/products?search=${encodeURIComponent(productData.name)}`, {
    headers: {
      'Cookie': `token=${token}`
    }
  });
  
  if (checkResponse.ok) {
    const response = await checkResponse.json();
    const products = response.products || [];
    const existing = products.find(p => p.name === productData.name);
    if (existing) {
      console.log(`      Using existing product: ${productData.name}`);
      return existing;
    }
  }
  
  // Map the mod group references to actual IDs
  const productModGroups = productData.modGroups.map(groupKey => modGroupIds[groupKey]).filter(Boolean);
  
  // Create new product if it doesn't exist
  const response = await fetch(`${API_BASE}/api/categories/${categoryId}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${token}`
    },
    body: JSON.stringify({
      product: {
        name: productData.name,
        type: productData.type || 'shop',  // Default to 'shop' type
        description: productData.description,
        category: categoryId,
        folder: folderId ? { _id: folderId } : null,  // Add folder assignment with _id structure
        variations: productData.variations,
        modGroups: productModGroups,
        locations: [],
        dirty: true,
        new: true,
        updated: true,
        waiverRequired: false,
        bump: false,
        thumbnail: productData.thumbnail || null
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create product ${productData.name}: ${error}`);
  }

  const result = await response.json();
  return result.product || result;
}

/**
 * Create a folder (or get existing one)
 */
async function createFolder(token, folderData, categoryId) {
  // First check if folder exists
  const checkResponse = await fetch(`${API_BASE}/api/folders?search=`, {
    headers: {
      'Cookie': `token=${token}`
    }
  });
  
  if (checkResponse.ok) {
    const folders = await checkResponse.json();
    const existing = folders.find(f => f.name === folderData.name && f.category === categoryId);
    if (existing) {
      console.log(`      Using existing folder: ${folderData.name}`);
      return existing;
    }
  }
  
  // Create new folder if it doesn't exist
  const response = await fetch(`${API_BASE}/api/folders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${token}`
    },
    body: JSON.stringify({
      name: folderData.name,
      color: folderData.color,
      category: categoryId
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create folder ${folderData.name}: ${error}`);
  }

  const result = await response.json();
  return result.folder || result;
}

/**
 * Create all categories and products from seed data
 */
async function seedProducts(token, modsData) {
  console.log('  Creating categories and products...');
  
  const categories = {};
  const folders = {};
  const products = {};
  
  // Create categories
  for (const [key, categoryData] of Object.entries(seedData.categories)) {
    console.log(`    Creating category: ${categoryData.name}`);
    const category = await createCategory(token, key, categoryData);
    categories[key] = category;
  }
  
  // Create folders
  if (seedData.folders) {
    for (const [key, folderData] of Object.entries(seedData.folders)) {
      const categoryKey = folderData.category;
      const category = categories[categoryKey];
      
      if (category) {
        console.log(`    Creating folder: ${folderData.name}`);
        const folder = await createFolder(token, folderData, category._id);
        folders[key] = folder;
      }
    }
  }
  
  // Create products
  for (const [key, productData] of Object.entries(seedData.products)) {
    const categoryKey = productData.category;
    const category = categories[categoryKey];
    
    if (!category) {
      console.log(`    Warning: Category ${categoryKey} not found for product ${productData.name}`);
      continue;
    }
    
    // Get folder if specified
    const folderKey = productData.folder;
    const folder = folderKey ? folders[folderKey] : null;
    
    console.log(`    Creating product: ${productData.name}`);
    const product = await createProduct(token, category._id, productData, modsData.modGroupIds, folder?._id);
    products[key] = product;
  }
  
  return {
    categories,
    products,
    categoryName: categories.coffees?.name || 'Coffees',
    productName: products.flatWhite?.name || 'Flat White'
  };
}

// Export as default test function for the test runner
async function testSeedProducts() {
  try {
    // Get the seed config to get the token and mod data
    const seedDataFile = require('path').join(__dirname, '.seed-data.json');
    const seedData = require('fs').existsSync(seedDataFile) 
      ? JSON.parse(require('fs').readFileSync(seedDataFile, 'utf8'))
      : null;
    
    if (!seedData || !seedData.token) {
      throw new Error('Test setup not found. Run test-seed-organization first.');
    }
    
    if (!seedData.modGroupIds) {
      throw new Error('Mod groups not found. Run test-seed-mods first.');
    }
    
    const result = await seedProducts(seedData.token, { modGroupIds: seedData.modGroupIds });
    
    // Save product data to seed data file
    const updatedData = { ...seedData, ...result };
    require('fs').writeFileSync(seedDataFile, JSON.stringify(updatedData, null, 2));
    
    return {
      passed: true,
      details: {
        categoriesCreated: Object.keys(result.categories).length,
        productsCreated: Object.keys(result.products).length,
        productName: result.productName
      }
    };
  } catch (error) {
    return {
      passed: false,
      error: error.message
    };
  }
}

module.exports = testSeedProducts;
module.exports.seedProducts = seedProducts;
module.exports.createCategory = createCategory;
module.exports.createProduct = createProduct;