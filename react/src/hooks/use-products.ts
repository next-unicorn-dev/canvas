import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Product,
  ProductCreate,
  ProductUpdate,
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} from '@/api/products'

// Query keys
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: () => [...productKeys.lists()] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
}

// Query: List products
export function useProducts() {
  return useQuery<Product[]>({
    queryKey: productKeys.list(),
    queryFn: listProducts,
  })
}

// Query: Get single product
export function useProduct(productId: string) {
  return useQuery<Product>({
    queryKey: productKeys.detail(productId),
    queryFn: () => getProduct(productId),
    enabled: !!productId,
  })
}

// Mutation: Create product
export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (product: ProductCreate) => createProduct(product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
    },
  })
}

// Mutation: Update product
export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductUpdate }) =>
      updateProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) })
    },
  })
}

// Mutation: Delete product
export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
    },
  })
}

