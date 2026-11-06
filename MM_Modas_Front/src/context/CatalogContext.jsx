// =========================================================
// CatalogContext — estado reativo de Categorias, Preços, Descontos e Estoque
// ---------------------------------------------------------
// Sincroniza o catálogo com o Back-end Spring Boot e mantém
// persistência local das alterações realizadas pela equipe.
// =========================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  apiCreateCategory,
  apiFetchCatalog,
  apiUpdateProductCommercial,
  buildMergedCategories,
  buildMergedProducts,
} from '../services/api.js'

const CatalogContext = createContext(null)

export function CatalogProvider({ children }) {
  const [categories, setCategories] = useState(() => buildMergedCategories([]))
  const [products, setProducts] = useState(() => buildMergedProducts([]))

  const refreshCatalog = useCallback(async () => {
    const res = await apiFetchCatalog()
    if (res?.categories) setCategories(res.categories)
    if (res?.products) setProducts(res.products)
  }, [])

  useEffect(() => {
    let active = true
    apiFetchCatalog().then((res) => {
      if (!active) return
      if (res?.categories) setCategories(res.categories)
      if (res?.products) setProducts(res.products)
    })
    return () => {
      active = false
    }
  }, [])

  const addCategory = useCallback(async ({ name, art, bg }) => {
    const created = await apiCreateCategory({ name, art, bg })
    setCategories((prev) => {
      if (prev.some((c) => c.id === created.id)) return prev
      return [...prev, created]
    })
    return created
  }, [])

  const updateProductCommercial = useCallback(async (slug, payload) => {
    const saved = await apiUpdateProductCommercial(slug, payload)
    setProducts((prev) =>
      prev.map((p) =>
        p.slug === slug
          ? {
              ...p,
              price: saved.price,
              oldPrice: saved.oldPrice,
              stock: saved.stock,
              category: saved.category ?? p.category,
            }
          : p,
      ),
    )
    return saved
  }, [])

  const getProductBySlug = useCallback(
    (slug) => products.find((p) => p.slug === slug),
    [products],
  )

  const getCategoryName = useCallback(
    (id) => categories.find((c) => c.id === id)?.name ?? id,
    [categories],
  )

  const value = useMemo(
    () => ({
      categories,
      products,
      addCategory,
      updateProductCommercial,
      getProductBySlug,
      getCategoryName,
      refreshCatalog,
    }),
    [categories, products, addCategory, updateProductCommercial, getProductBySlug, getCategoryName, refreshCatalog],
  )

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog precisa estar dentro de <CatalogProvider>')
  return ctx
}
