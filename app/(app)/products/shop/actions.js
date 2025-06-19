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

export function actions({category, setProducts}) {

  const setFolder = ({ pIdx, folder }) => {
    setProducts(draft => {
      const product = draft[pIdx];
      if (!product) return;

      product.folder = folder;
      product.updated = true;
    });
  };

  const addProduct = () => {
    setProducts(draft => {
      const newModCats = buildModCatsFromProducts(draft);

      draft.unshift({
        dirty: true,
        modCats: newModCats,
        name: '',
        new: true,
        _id: generateObjectId()
      });
    });
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
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${category._id}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product }),
    });

    if (res.ok) {
      const savedProduct = await res.json();
      setProducts(draft => {
        draft[pIdx] = savedProduct.product;
      });
      return savedProduct.product
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
    deleteVariation,
    addModCat,
    updateModCat,
    addMod,
    updateMod,
    saveMod,
    setFolder
  }
}