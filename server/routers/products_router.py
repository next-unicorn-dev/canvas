"""
Products Router - API endpoints for product management.
"""

import uuid
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Header, HTTPException, status

from services.auth_service import auth_service
from services.db_service import db_service


router = APIRouter(prefix="/api/products", tags=["products"])


class ProductCreate(BaseModel):
    name: str
    image_url: str
    brand: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    currency: str = "KRW"  # KRW, USD 등
    has_discount: bool = False
    discount_price: Optional[float] = None
    highlight_points: Optional[str] = None
    target_country: Optional[str] = None  # 타겟 국가
    target_gender: Optional[str] = None  # 타겟 성별: all, male, female
    target_age_group: Optional[str] = None  # 타겟 연령대: 예) 20-30


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    image_url: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    has_discount: Optional[bool] = None
    discount_price: Optional[float] = None
    highlight_points: Optional[str] = None
    target_country: Optional[str] = None
    target_gender: Optional[str] = None
    target_age_group: Optional[str] = None


class ProductResponse(BaseModel):
    id: str
    user_id: str
    name: str
    image_url: str
    brand: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = "KRW"
    has_discount: bool = False
    discount_price: Optional[float] = None
    highlight_points: Optional[str] = None
    target_country: Optional[str] = None
    target_gender: Optional[str] = None
    target_age_group: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@router.post("", response_model=ProductResponse)
async def create_product(
    product: ProductCreate,
    authorization: str = Header(None),
):
    """Create a new product."""
    token = auth_service.extract_token_from_header(authorization)
    user = await auth_service.validate_token(token)
    user_id = user["id"]
    
    product_id = str(uuid.uuid4())
    
    result = await db_service.create_product(
        product_id=product_id,
        user_id=user_id,
        name=product.name,
        image_url=product.image_url,
        brand=product.brand,
        category=product.category,
        price=product.price,
        currency=product.currency,
        has_discount=product.has_discount,
        discount_price=product.discount_price,
        highlight_points=product.highlight_points,
        target_country=product.target_country,
        target_gender=product.target_gender,
        target_age_group=product.target_age_group,
    )
    
    return result


@router.get("", response_model=List[ProductResponse])
async def list_products(
    authorization: str = Header(None),
):
    """List all products for the current user."""
    token = auth_service.extract_token_from_header(authorization)
    user = await auth_service.validate_token(token)
    user_id = user["id"]
    
    products = await db_service.get_products_by_user(user_id)
    return products


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    authorization: str = Header(None),
):
    """Get a specific product."""
    token = auth_service.extract_token_from_header(authorization)
    user = await auth_service.validate_token(token)
    user_id = user["id"]
    
    product = await db_service.get_product(product_id)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Ensure user owns the product
    if product["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this product"
        )
    
    return product


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_update: ProductUpdate,
    authorization: str = Header(None),
):
    """Update a product."""
    token = auth_service.extract_token_from_header(authorization)
    user = await auth_service.validate_token(token)
    user_id = user["id"]
    
    # Check product exists and user owns it
    existing = await db_service.get_product(product_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if existing["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this product"
        )
    
    # Update product
    update_data = product_update.model_dump(exclude_unset=True)
    result = await db_service.update_product(product_id, **update_data)
    
    return result


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    authorization: str = Header(None),
):
    """Delete a product."""
    token = auth_service.extract_token_from_header(authorization)
    user = await auth_service.validate_token(token)
    user_id = user["id"]
    
    # Check product exists and user owns it
    existing = await db_service.get_product(product_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if existing["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this product"
        )
    
    await db_service.delete_product(product_id)
    
    return {"status": "success", "message": "Product deleted"}

