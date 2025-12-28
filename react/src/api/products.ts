import { BASE_API_URL } from '../constants'
import { getAccessToken } from './auth'
import { compressImageFile } from '@/utils/imageUtils'

export interface Product {
    id: string
    user_id: string
    name: string
    image_url: string
    brand?: string
    category?: string
    price?: number
    currency?: string
    has_discount: boolean
    discount_price?: number
    highlight_points?: string
    target_country?: string
    target_gender?: string
    target_age_group?: string
    created_at?: string
    updated_at?: string
}

export interface ProductCreate {
    name: string
    image_url: string
    brand?: string
    category?: string
    price?: number
    currency?: string
    has_discount?: boolean
    discount_price?: number
    highlight_points?: string
    target_country?: string
    target_gender?: string
    target_age_group?: string
}

export type ProductUpdate = Partial<ProductCreate>

function getProductsEndpoint(path: string = '') {
    return `${BASE_API_URL}/api/products${path}`
}

function getAuthHeaders() {
    const token = getAccessToken()
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

export async function createProduct(product: ProductCreate): Promise<Product> {
    const response = await fetch(getProductsEndpoint(''), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(product),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to create product')
    }

    return response.json()
}

export async function listProducts(): Promise<Product[]> {
    const response = await fetch(getProductsEndpoint(''), {
        method: 'GET',
        headers: getAuthHeaders(),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to list products')
    }

    return response.json()
}

export async function getProduct(productId: string): Promise<Product> {
    const response = await fetch(getProductsEndpoint(`/${productId}`), {
        method: 'GET',
        headers: getAuthHeaders(),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to get product')
    }

    return response.json()
}

export async function updateProduct(
    productId: string,
    product: ProductUpdate
): Promise<Product> {
    const response = await fetch(getProductsEndpoint(`/${productId}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(product),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to update product')
    }

    return response.json()
}

export async function deleteProduct(productId: string): Promise<void> {
    const response = await fetch(getProductsEndpoint(`/${productId}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to delete product')
    }
}

export interface UploadImageResponse {
    file_id: string
    url: string
    width: number
    height: number
}

export async function uploadProductImage(file: File): Promise<UploadImageResponse> {
    // Compress image before upload
    const compressedFile = await compressImageFile(file)

    const formData = new FormData()
    formData.append('file', compressedFile)

    // Try S3 upload first, fallback to local upload
    let response = await fetch(`${BASE_API_URL}/api/upload_image_s3`, {
        method: 'POST',
        body: formData,
    })

    // If S3 fails (503 = not configured), fallback to local upload
    if (response.status === 503) {
        console.log('S3 not configured, falling back to local upload')
        const localFormData = new FormData()
        localFormData.append('file', compressedFile)
        response = await fetch(`${BASE_API_URL}/api/upload_image`, {
            method: 'POST',
            body: localFormData,
        })
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || 'Failed to upload image')
    }

    return response.json()
}

