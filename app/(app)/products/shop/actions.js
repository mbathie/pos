import { generateObjectId } from '@/lib/utils';

function buildModCatsFromProducts(products) {
  const unionModCats = {};

  for (const product of products) {
    for (const modCat of product.modCats || []) {
      if (!unionModCats[modCat.name]) {
        unionModCats[modCat.name] = new Map();
      }
      for (const mod of modCat.mods || []) {
        unionModCats[modCat.name].set(mod.name, mod.amount ?? 0);
      }
    }
  }

  return Object.entries(unionModCats).map(([name, modsMap]) => ({
    name,
    _id: generateObjectId(),
    mods: Array.from(modsMap.entries()).map(([modName, amount]) => ({
      name: modName,
      amount,
      enabled: false,
      _id: generateObjectId()
    }))
  }));
}

function syncModAcrossProducts(draft, pIdx, modCatName, modName, modAmount) {
  draft.forEach((product, i) => {
    if (i === pIdx) return;

    let targetModCat = product.modCats?.find(cat => cat.name === modCatName);

    if (!targetModCat) {
      if (!product.modCats) product.modCats = [];

      product.modCats.push({
        name: modCatName,
        _id: generateObjectId(),
        mods: [{
          name: modName,
          amount: modAmount,
          enabled: false,
          _id: generateObjectId()
        }]
      });

      product.updated = true;
    } else {
      const hasMod = targetModCat.mods.some(m => m.name === modName);
      if (!hasMod) {
        targetModCat.mods.push({
          name: modName,
          amount: modAmount,
          enabled: false,
          _id: generateObjectId()
        });
        product.updated = true;
      }
    }
  });
}

export function actions({category, setProducts, setAllProducts}) {

  const setFolder = ({ pIdx, folder }) => {
    // console.log(folder)
    // console.log(pIdx)
    setProducts(draft => {
      const product = draft[pIdx];
      if (!product) return;

      product.folder = folder;
      product.updated = true;
    });
  };

  const deleteCategory = async ({ category: categoryToDelete, setCategory, setCategories, categories }) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${categoryToDelete._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log("Category deletion response:", data);
        
        // Remove the category from the list
        setCategories(categories.filter(c => c._id !== categoryToDelete._id));
        // Reset the current category if it was deleted
        if (category._id === categoryToDelete._id) {
          setCategory({});
          setProducts([]);
        }
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const addProduct = (selectedFolder = null) => {
    const newProductId = generateObjectId();

    setProducts(draft => {
      const newModCats = buildModCatsFromProducts(draft);

      const newProduct = {
        dirty: true,
        modCats: newModCats,
        name: '',
        type: 'shop',
        new: true,
        _id: newProductId
      };

      // If a folder is selected, set it as the default for the new product
      if (selectedFolder) {
        newProduct.folder = selectedFolder;
      }

      draft.unshift(newProduct);
    });

    // Also update allProducts if it exists
    if (setAllProducts) {
      setAllProducts(draft => {
        const newModCats = buildModCatsFromProducts(draft);

        const newProduct = {
          dirty: true,
          modCats: newModCats,
          name: '',
          type: 'shop',
          new: true,
          _id: newProductId
        };

        // If a folder is selected, set it as the default for the new product
        if (selectedFolder) {
          newProduct.folder = selectedFolder;
        }

        draft.unshift(newProduct);
      });
    }

    return newProductId;
  };

  const updateProduct = ({ pIdx, key, value }) => {
    setProducts(draft => {
      const product = draft[pIdx];
      if (!product) return;

      product[key] = value;
      product.updated = true;
    });
  }

  const saveProduct = async ({product, pIdx}) => {
    // Check if product is new first (new products have temporary _id but need POST)
    if (product.new) {
      // Create new product - ensure category is set
      // Remove the _id, new, dirty, and updated fields
      const { _id, new: isNew, dirty, updated, ...productWithoutId } = product;
      const productWithCategory = { ...productWithoutId, category: category._id };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: productWithCategory }),
      });

      if (res.ok) {
        const savedProduct = await res.json();
        setProducts(draft => {
          // Replace the temporary product with the saved one
          draft[pIdx] = {
            ...savedProduct.product,
            new: false, // Mark as no longer new
            dirty: false,
            updated: false
          };
        });
        return savedProduct.product;
      }
    } else if (product._id) {
      // Update existing product
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${product._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedProduct = data.product || data; // Handle both { product: ... } and direct product
        setProducts(draft => {
          // Find the index again in case it changed
          const currentIdx = draft.findIndex(p => p._id === updatedProduct._id);
          if (currentIdx !== -1) {
            draft[currentIdx] = updatedProduct;
          }
        });
        return updatedProduct;
      }
    }
  }

  const deleteProduct = async ({ pIdx, product }) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${product._id}`, {
      method: 'DELETE',
    });

    setProducts(draft => {
      draft.splice(pIdx, 1); // mutate only
    });
  };

  const addVariation = ({ pIdx }) => {
    setProducts(draft => {
      const product = draft[pIdx]
      if (!product.variations)
        product.variations = []

      product.variations.push({
        name: '',
        value: '',
        new: true,
      })

      product.updated = true;
    });
  }

  const updateVariation = ({ pIdx, vIdx, key, value }) => {
    setProducts(draft => {
      const product = draft[pIdx];
      if (!product.variations || !product.variations[vIdx]) return;

      product.variations[vIdx][key] = value;
      product.updated = true;
    });
  }

  const deleteVariation = ({ pIdx, vIdx }) => {
    setProducts(draft => {
      const product = draft[pIdx];
      if (!product?.variations || !product.variations[vIdx]) return;

      product.variations.splice(vIdx, 1);
      product.updated = true;
    });
  }

  const addModCat = ({ pIdx, name, multi }) => {
    setProducts(draft => {
      const product = draft[pIdx];
      if (!product.modCats) {
        product.modCats = [];
      }

      product.modCats.push({
        name,
        _id: generateObjectId(),
        mods: [],
        multi
      });

      product.updated = true;
    });
  };

  const updateModCat = ({ pIdx, mcIdx, key, value }) => {
    setProducts(draft => {
      const product = draft[pIdx];
      if (!product?.modCats?.[mcIdx]) return;

      product.modCats[mcIdx][key] = value;
      product.updated = true;
    });
  }

  const addMod = ({ pIdx, mcIdx }) => {
    setProducts(draft => {
      const product = draft[pIdx];
      if (!product?.modCats?.[mcIdx]?.mods) return;

      product.modCats[mcIdx].mods.push({
        name: '',
        amount: 0,
        new: true,
        _id: generateObjectId()
      });

      product.updated = true;
    });
  };

  const updateMod = ({ pIdx, mcIdx, mIdx, key, value }) => {
    setProducts(draft => {
      const product = draft[pIdx];
      if (!product?.modCats?.[mcIdx]?.mods?.[mIdx]) return;

      product.modCats[mcIdx].mods[mIdx][key] = value;
      product.updated = true;
    });
  }

  const saveMod = ({ pIdx, mcIdx, mIdx }) => {
    setProducts(draft => {
      const sourceProduct = draft[pIdx];
      const sourceModCat = sourceProduct?.modCats?.[mcIdx];
      const mod = sourceModCat?.mods?.[mIdx];
      if (!mod) return;

      // Mark as saved
      mod.new = false;
      mod.enabled = true;
      sourceProduct.updated = true;

      const modCatName = sourceModCat.name;
      const modName = mod.name;
      const modAmount = mod.amount;

      syncModAcrossProducts(draft, pIdx, modCatName, modName, modAmount);
    });
  }


  return {
    addVariation,
    updateVariation,
    updateProduct,
    saveProduct,
    addProduct,
    deleteProduct,
    deleteCategory,
    deleteVariation,
    addModCat,
    updateModCat,
    addMod,
    updateMod,
    saveMod,
    setFolder
  }
}