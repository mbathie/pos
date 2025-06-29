export function useHandler({}) {

  const getCategory = async ({name}) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${name}`)
    const cat = await res.json()
    return cat
  }

  const getProducts = async ({category}) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${category._id}/products`)
    const products = await res.json()
    return products
  }


  return { getProducts, getCategory }
}