import TopMenu from '@/components/TopMenu'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Package, Plus, Trash2, Loader2, ImageIcon, Upload, X, Pencil, Save } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/use-products'
import { Product, ProductCreate, ProductUpdate, uploadProductImage } from '@/api/products'
import { useAuth } from '@/contexts/AuthContext'

export const Route = createFileRoute('/products/')({
  component: Products,
})

const CURRENCIES = [
  { value: 'KRW', label: '₩ 원화 (KRW)' },
  { value: 'USD', label: '$ 달러 (USD)' },
  { value: 'EUR', label: '€ 유로 (EUR)' },
  { value: 'JPY', label: '¥ 엔화 (JPY)' },
  { value: 'CNY', label: '¥ 위안 (CNY)' },
]

const GENDERS = [
  { value: 'all', label: '전체' },
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
]

const AGE_GROUPS = [
  { value: '10-19', label: '10대' },
  { value: '20-29', label: '20대' },
  { value: '30-39', label: '30대' },
  { value: '40-49', label: '40대' },
  { value: '50-59', label: '50대' },
  { value: '60+', label: '60대 이상' },
  { value: 'all', label: '전체 연령' },
]

const CATEGORIES = [
  { value: 'fashion', label: '패션/의류' },
  { value: 'beauty', label: '뷰티/화장품' },
  { value: 'food', label: '식품/음료' },
  { value: 'electronics', label: '전자제품' },
  { value: 'home', label: '홈/리빙' },
  { value: 'sports', label: '스포츠/레저' },
  { value: 'kids', label: '유아/아동' },
  { value: 'health', label: '건강/헬스' },
  { value: 'etc', label: '기타' },
]

function Products() {
  const { t } = useTranslation()
  const { authStatus } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editFormData, setEditFormData] = useState<ProductUpdate>({})
  const [isUploading, setIsUploading] = useState(false)
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  const { data: products, isLoading } = useProducts()
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const deleteMutation = useDeleteProduct()

  const [formData, setFormData] = useState<ProductCreate>({
    name: '',
    image_url: '',
    brand: '',
    category: '',
    price: undefined,
    currency: 'KRW',
    has_discount: false,
    discount_price: undefined,
    highlight_points: '',
    target_country: '',
    target_gender: '',
    target_age_group: '',
  })

  const resetForm = () => {
    setFormData({
      name: '',
      image_url: '',
      brand: '',
      category: '',
      price: undefined,
      currency: 'KRW',
      has_discount: false,
      discount_price: undefined,
      highlight_points: '',
      target_country: '',
      target_gender: '',
      target_age_group: '',
    })
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('canvas:invalidImageType', '이미지 파일만 업로드할 수 있습니다'))
      return
    }

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to S3
    try {
      setIsUploading(true)
      const result = await uploadProductImage(file)
      setFormData({ ...formData, image_url: result.url })
      toast.success(t('canvas:imageUploaded', '이미지가 업로드되었습니다'))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('canvas:imageUploadFailed', '이미지 업로드에 실패했습니다')
      )
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const clearImage = () => {
    setFormData({ ...formData, image_url: '' })
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error(t('canvas:productNameRequired', '상품명을 입력해주세요'))
      return
    }

    if (!formData.image_url.trim()) {
      toast.error(t('canvas:productImageRequired', '상품 이미지를 업로드해주세요'))
      return
    }

    try {
      await createMutation.mutateAsync(formData)
      toast.success(t('canvas:productCreated', '상품이 등록되었습니다'))
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('canvas:productCreateFailed', '상품 등록에 실패했습니다')
      )
    }
  }

  const handleDelete = async (productId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!confirm(t('canvas:confirmDeleteProduct', '이 상품을 삭제하시겠습니까?'))) {
      return
    }

    try {
      await deleteMutation.mutateAsync(productId)
      toast.success(t('canvas:productDeleted', '상품이 삭제되었습니다'))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('canvas:productDeleteFailed', '상품 삭제에 실패했습니다')
      )
    }
  }

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
    setIsEditMode(false)
    setEditFormData({})
    setEditPreviewUrl(null)
    setIsDetailDialogOpen(true)
  }

  const startEditMode = () => {
    if (!selectedProduct) return
    setEditFormData({
      name: selectedProduct.name,
      image_url: selectedProduct.image_url,
      brand: selectedProduct.brand || '',
      category: selectedProduct.category || '',
      price: selectedProduct.price,
      currency: selectedProduct.currency || 'KRW',
      has_discount: selectedProduct.has_discount,
      discount_price: selectedProduct.discount_price,
      highlight_points: selectedProduct.highlight_points || '',
      target_country: selectedProduct.target_country || '',
      target_gender: selectedProduct.target_gender || '',
      target_age_group: selectedProduct.target_age_group || '',
    })
    setEditPreviewUrl(selectedProduct.image_url || null)
    setIsEditMode(true)
  }

  const cancelEditMode = () => {
    setIsEditMode(false)
    setEditFormData({})
    setEditPreviewUrl(null)
  }

  const handleEditFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('canvas:invalidImageType', '이미지 파일만 업로드할 수 있습니다'))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setEditPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    try {
      setIsUploading(true)
      const result = await uploadProductImage(file)
      setEditFormData({ ...editFormData, image_url: result.url })
      toast.success(t('canvas:imageUploaded', '이미지가 업로드되었습니다'))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('canvas:imageUploadFailed', '이미지 업로드에 실패했습니다')
      )
      setEditPreviewUrl(selectedProduct?.image_url || null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleEditSubmit = async () => {
    if (!selectedProduct) return

    if (!editFormData.name?.trim()) {
      toast.error(t('canvas:productNameRequired', '상품명을 입력해주세요'))
      return
    }

    if (!editFormData.image_url?.trim()) {
      toast.error(t('canvas:productImageRequired', '상품 이미지를 업로드해주세요'))
      return
    }

    try {
      const updatedProduct = await updateMutation.mutateAsync({
        id: selectedProduct.id,
        data: editFormData,
      })
      setSelectedProduct({ ...selectedProduct, ...updatedProduct })
      toast.success(t('canvas:productUpdated', '상품이 수정되었습니다'))
      setIsEditMode(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('canvas:productUpdateFailed', '상품 수정에 실패했습니다')
      )
    }
  }

  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return '-'
    const symbols: Record<string, string> = {
      KRW: '₩',
      USD: '$',
      EUR: '€',
      JPY: '¥',
      CNY: '¥',
    }
    const symbol = symbols[currency || 'KRW'] || ''
    return `${symbol}${price.toLocaleString()}`
  }

  // Show login prompt if not logged in
  if (!authStatus.is_logged_in) {
    return (
      <div className="flex flex-col w-screen h-screen">
        <TopMenu />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {t('canvas:loginRequired', '로그인이 필요합니다')}
            </h2>
            <p className="text-muted-foreground">
              {t('canvas:loginToManageProducts', '상품을 관리하려면 로그인해주세요')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-screen h-screen">
      <TopMenu />
      <ScrollArea className="flex-1">
        <div className="container mx-auto px-6 py-8 max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold mb-1">
                  {t('canvas:products', '내 상품 관리')}
                </h1>
                <p className="text-muted-foreground">
                  {t('canvas:productsDescription', '상품을 등록하고 관리하여 광고 제작에 활용하세요')}
                </p>
              </div>
            </div>

            {/* Add Product Button */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('canvas:addProduct', '상품 등록')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('canvas:addProduct', '상품 등록')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                  {/* Required Fields */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        {t('canvas:productName', '상품명')} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t('canvas:productNamePlaceholder', '상품명을 입력하세요')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        {t('canvas:productImage', '상품 이미지')} <span className="text-destructive">*</span>
                      </Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                      {previewUrl || formData.image_url ? (
                        <div className="relative w-full aspect-square max-w-[200px] rounded-lg overflow-hidden border">
                          <img
                            src={previewUrl || formData.image_url}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          {isUploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 className="w-8 h-8 text-white animate-spin" />
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={clearImage}
                            disabled={isUploading}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                        >
                          <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            {t('canvas:dropImageHere', '이미지를 드래그하거나 클릭하여 업로드')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG, GIF (최대 3MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Optional Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand">{t('canvas:productBrand', '브랜드')}</Label>
                      <Input
                        id="brand"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        placeholder={t('canvas:productBrandPlaceholder', '브랜드명')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">{t('canvas:productCategory', '카테고리')}</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('canvas:selectCategory', '카테고리 선택')} />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Price Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">{t('canvas:productPrice', '가격')}</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value ? Number(e.target.value) : undefined })
                        }
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currency">{t('canvas:currency', '통화')}</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((cur) => (
                            <SelectItem key={cur.value} value={cur.value}>
                              {cur.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Discount Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="has_discount"
                        checked={formData.has_discount}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, has_discount: checked, discount_price: checked ? formData.discount_price : undefined })
                        }
                      />
                      <Label htmlFor="has_discount">{t('canvas:hasDiscount', '할인 적용')}</Label>
                    </div>

                    {formData.has_discount && (
                      <div className="space-y-2">
                        <Label htmlFor="discount_price">{t('canvas:discountPrice', '할인가')}</Label>
                        <Input
                          id="discount_price"
                          type="number"
                          value={formData.discount_price || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, discount_price: e.target.value ? Number(e.target.value) : undefined })
                          }
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>

                  {/* Highlight Points */}
                  <div className="space-y-2">
                    <Label htmlFor="highlight_points">{t('canvas:highlightPoints', '강조 포인트')}</Label>
                    <Textarea
                      id="highlight_points"
                      value={formData.highlight_points}
                      onChange={(e) => setFormData({ ...formData, highlight_points: e.target.value })}
                      placeholder={t('canvas:highlightPointsPlaceholder', '상품의 특징이나 강조할 점을 입력하세요')}
                      rows={3}
                    />
                  </div>

                  {/* Targeting Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">{t('canvas:targeting', '타겟팅')}</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="target_country">{t('canvas:targetCountry', '타겟 국가')}</Label>
                        <Input
                          id="target_country"
                          value={formData.target_country}
                          onChange={(e) => setFormData({ ...formData, target_country: e.target.value })}
                          placeholder={t('canvas:targetCountryPlaceholder', '예: 한국, 미국')}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="target_gender">{t('canvas:targetGender', '타겟 성별')}</Label>
                        <Select
                          value={formData.target_gender}
                          onValueChange={(value) => setFormData({ ...formData, target_gender: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('canvas:selectGender', '성별 선택')} />
                          </SelectTrigger>
                          <SelectContent>
                            {GENDERS.map((g) => (
                              <SelectItem key={g.value} value={g.value}>
                                {g.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="target_age_group">{t('canvas:targetAgeGroup', '타겟 연령대')}</Label>
                        <Select
                          value={formData.target_age_group}
                          onValueChange={(value) => setFormData({ ...formData, target_age_group: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('canvas:selectAgeGroup', '연령대 선택')} />
                          </SelectTrigger>
                          <SelectContent>
                            {AGE_GROUPS.map((ag) => (
                              <SelectItem key={ag.value} value={ag.value}>
                                {ag.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      {t('common:buttons.cancel', '취소')}
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {t('canvas:registerProduct', '등록하기')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Products List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : products && products.length > 0 ? (
            <div className="flex flex-col gap-3">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="flex items-center">
                    {/* 이미지 영역 */}
                    <div className="w-24 h-24 min-w-24 relative bg-muted">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      {product.has_discount && (
                        <div className="absolute top-1 left-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                          SALE
                        </div>
                      )}
                    </div>

                    {/* 상품 정보 영역 */}
                    <CardContent className="flex-1 min-w-0 overflow-hidden p-4">
                      <div className="flex items-center gap-4">
                        {/* 브랜드 & 상품명 */}
                        <div className="min-w-0 flex-1">
                          {product.brand && (
                            <p className="text-xs text-muted-foreground mb-0.5">{product.brand}</p>
                          )}
                          <h3 className="font-semibold truncate">{product.name}</h3>
                        </div>

                        {/* 카테고리 */}
                        {product.category && (
                          <div className="hidden md:block text-sm text-muted-foreground whitespace-nowrap">
                            {CATEGORIES.find((c) => c.value === product.category)?.label || product.category}
                          </div>
                        )}

                        {/* 가격 정보 */}
                        <div className="text-right shrink-0">
                          {product.has_discount && product.discount_price ? (
                            <div className="flex flex-col items-end">
                              <span className="text-base font-bold text-red-500">
                                {formatPrice(product.discount_price, product.currency)}
                              </span>
                              <span className="text-xs text-muted-foreground line-through">
                                {formatPrice(product.price, product.currency)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-base font-bold">
                              {formatPrice(product.price, product.currency)}
                            </span>
                          )}
                        </div>

                        {/* 삭제 버튼 */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive shrink-0"
                          onClick={(e) => handleDelete(product.id, e)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {t('canvas:noProducts', '등록된 상품이 없습니다')}
              </h2>
              <p className="text-muted-foreground max-w-md mb-6">
                {t('canvas:noProductsDescription', '상품을 등록하면 광고 소재 제작 시 상품 정보를 활용할 수 있습니다.')}
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('canvas:addFirstProduct', '첫 상품 등록하기')}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 상품 상세 정보 Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditMode(false)
          setEditFormData({})
          setEditPreviewUrl(null)
        }
        setIsDetailDialogOpen(open)
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? t('canvas:editProduct', '상품 수정') : t('canvas:productDetail', '상품 상세 정보')}
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            isEditMode ? (
              /* 수정 모드 */
              <div className="space-y-6">
                {/* 이미지 업로드 */}
                <div className="space-y-2">
                  <Label>{t('canvas:productImage', '상품 이미지')} <span className="text-destructive">*</span></Label>
                  <div
                    className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => editFileInputRef.current?.click()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const file = e.dataTransfer.files?.[0]
                      if (file) handleEditFileSelect(file)
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {isUploading ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : editPreviewUrl || editFormData.image_url ? (
                      <>
                        <img
                          src={editPreviewUrl || editFormData.image_url}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="w-8 h-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <Upload className="w-12 h-12 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {t('canvas:clickOrDragToUpload', '클릭하거나 드래그하여 업로드')}
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleEditFileSelect(file)
                    }}
                  />
                </div>

                {/* 상품명 */}
                <div className="space-y-2">
                  <Label htmlFor="edit_name">{t('canvas:productName', '상품명')} <span className="text-destructive">*</span></Label>
                  <Input
                    id="edit_name"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder={t('canvas:productNamePlaceholder', '상품명을 입력하세요')}
                  />
                </div>

                {/* 브랜드 & 카테고리 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_brand">{t('canvas:brand', '브랜드')}</Label>
                    <Input
                      id="edit_brand"
                      value={editFormData.brand || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                      placeholder={t('canvas:brandPlaceholder', '브랜드명')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_category">{t('canvas:category', '카테고리')}</Label>
                    <Select
                      value={editFormData.category || ''}
                      onValueChange={(value) => setEditFormData({ ...editFormData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('canvas:selectCategory', '카테고리 선택')} />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 가격 정보 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_price">{t('canvas:price', '가격')}</Label>
                    <Input
                      id="edit_price"
                      type="number"
                      value={editFormData.price || ''}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, price: e.target.value ? Number(e.target.value) : undefined })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_currency">{t('canvas:currency', '통화')}</Label>
                    <Select
                      value={editFormData.currency || 'KRW'}
                      onValueChange={(value) => setEditFormData({ ...editFormData, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 할인 정보 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="edit_has_discount"
                      checked={editFormData.has_discount || false}
                      onCheckedChange={(checked) =>
                        setEditFormData({ ...editFormData, has_discount: checked })
                      }
                    />
                    <Label htmlFor="edit_has_discount">{t('canvas:hasDiscount', '할인 적용')}</Label>
                  </div>
                  {editFormData.has_discount && (
                    <div className="space-y-2">
                      <Label htmlFor="edit_discount_price">{t('canvas:discountPrice', '할인가')}</Label>
                      <Input
                        id="edit_discount_price"
                        type="number"
                        value={editFormData.discount_price || ''}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, discount_price: e.target.value ? Number(e.target.value) : undefined })
                        }
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>

                {/* 강조 포인트 */}
                <div className="space-y-2">
                  <Label htmlFor="edit_highlight_points">{t('canvas:highlightPoints', '강조 포인트')}</Label>
                  <Textarea
                    id="edit_highlight_points"
                    value={editFormData.highlight_points || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, highlight_points: e.target.value })}
                    placeholder={t('canvas:highlightPointsPlaceholder', '상품의 특징이나 강조할 점을 입력하세요')}
                    rows={3}
                  />
                </div>

                {/* 타겟팅 */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_target_country">{t('canvas:targetCountry', '타겟 국가')}</Label>
                    <Input
                      id="edit_target_country"
                      value={editFormData.target_country || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, target_country: e.target.value })}
                      placeholder={t('canvas:targetCountryPlaceholder', '예: 한국, 미국')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_target_gender">{t('canvas:targetGender', '타겟 성별')}</Label>
                    <Select
                      value={editFormData.target_gender || ''}
                      onValueChange={(value) => setEditFormData({ ...editFormData, target_gender: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('canvas:selectGender', '성별 선택')} />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDERS.map((g) => (
                          <SelectItem key={g.value} value={g.value}>
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_target_age_group">{t('canvas:targetAgeGroup', '타겟 연령대')}</Label>
                    <Select
                      value={editFormData.target_age_group || ''}
                      onValueChange={(value) => setEditFormData({ ...editFormData, target_age_group: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('canvas:selectAgeGroup', '연령대 선택')} />
                      </SelectTrigger>
                      <SelectContent>
                        {AGE_GROUPS.map((ag) => (
                          <SelectItem key={ag.value} value={ag.value}>
                            {ag.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 수정 액션 버튼 */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={cancelEditMode}>
                    {t('common:buttons.cancel', '취소')}
                  </Button>
                  <Button onClick={handleEditSubmit} disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Save className="w-4 h-4 mr-2" />
                    {t('common:buttons.save', '저장')}
                  </Button>
                </div>
              </div>
            ) : (
              /* 보기 모드 */
              <div className="space-y-6">
                {/* 이미지 */}
                <div className="w-full aspect-video relative bg-muted rounded-lg overflow-hidden">
                  {selectedProduct.image_url ? (
                    <img
                      src={selectedProduct.image_url}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                  {selectedProduct.has_discount && (
                    <Badge variant="destructive" className="absolute top-3 left-3">
                      SALE
                    </Badge>
                  )}
                </div>

                {/* 기본 정보 */}
                <div className="space-y-4">
                  <div>
                    {selectedProduct.brand && (
                      <p className="text-sm text-muted-foreground">{selectedProduct.brand}</p>
                    )}
                    <h2 className="text-2xl font-bold">{selectedProduct.name}</h2>
                  </div>

                  {/* 가격 정보 */}
                  <div className="flex items-baseline gap-3">
                    {selectedProduct.has_discount && selectedProduct.discount_price ? (
                      <>
                        <span className="text-2xl font-bold text-red-500">
                          {formatPrice(selectedProduct.discount_price, selectedProduct.currency)}
                        </span>
                        <span className="text-lg text-muted-foreground line-through">
                          {formatPrice(selectedProduct.price, selectedProduct.currency)}
                        </span>
                        {selectedProduct.price && selectedProduct.discount_price && (
                          <Badge variant="secondary" className="text-red-500">
                            {Math.round((1 - selectedProduct.discount_price / selectedProduct.price) * 100)}% OFF
                          </Badge>
                        )}
                      </>
                    ) : (
                      <span className="text-2xl font-bold">
                        {formatPrice(selectedProduct.price, selectedProduct.currency)}
                      </span>
                    )}
                  </div>
                </div>

                <Separator />

                {/* 상세 정보 그리드 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedProduct.category && (
                    <div>
                      <p className="text-muted-foreground mb-1">{t('canvas:category', '카테고리')}</p>
                      <p className="font-medium">
                        {CATEGORIES.find((c) => c.value === selectedProduct.category)?.label || selectedProduct.category}
                      </p>
                    </div>
                  )}

                  {selectedProduct.currency && (
                    <div>
                      <p className="text-muted-foreground mb-1">{t('canvas:currency', '통화')}</p>
                      <p className="font-medium">
                        {CURRENCIES.find((c) => c.value === selectedProduct.currency)?.label || selectedProduct.currency}
                      </p>
                    </div>
                  )}

                  {selectedProduct.target_country && (
                    <div>
                      <p className="text-muted-foreground mb-1">{t('canvas:targetCountry', '타겟 국가')}</p>
                      <p className="font-medium">{selectedProduct.target_country}</p>
                    </div>
                  )}

                  {selectedProduct.target_gender && (
                    <div>
                      <p className="text-muted-foreground mb-1">{t('canvas:targetGender', '타겟 성별')}</p>
                      <p className="font-medium">
                        {GENDERS.find((g) => g.value === selectedProduct.target_gender)?.label || selectedProduct.target_gender}
                      </p>
                    </div>
                  )}

                  {selectedProduct.target_age_group && (
                    <div>
                      <p className="text-muted-foreground mb-1">{t('canvas:targetAgeGroup', '타겟 연령대')}</p>
                      <p className="font-medium">
                        {AGE_GROUPS.find((a) => a.value === selectedProduct.target_age_group)?.label || selectedProduct.target_age_group}
                      </p>
                    </div>
                  )}
                </div>

                {/* 강조 포인트 */}
                {selectedProduct.highlight_points && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground mb-2">{t('canvas:highlightPoints', '강조 포인트')}</p>
                      <p className="whitespace-pre-wrap">{selectedProduct.highlight_points}</p>
                    </div>
                  </>
                )}

                {/* 등록/수정 일시 */}
                <Separator />
                <div className="flex gap-6 text-xs text-muted-foreground">
                  {selectedProduct.created_at && (
                    <p>
                      {t('canvas:createdAt', '등록일')}: {new Date(selectedProduct.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  )}
                  {selectedProduct.updated_at && (
                    <p>
                      {t('canvas:updatedAt', '수정일')}: {new Date(selectedProduct.updated_at).toLocaleDateString('ko-KR')}
                    </p>
                  )}
                </div>

                {/* 액션 버튼 */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="destructive"
                    onClick={(e) => {
                      handleDelete(selectedProduct.id, e)
                      setIsDetailDialogOpen(false)
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('common:buttons.delete', '삭제')}
                  </Button>
                  <Button variant="outline" onClick={startEditMode}>
                    <Pencil className="w-4 h-4 mr-2" />
                    {t('common:buttons.edit', '수정')}
                  </Button>
                  <Button onClick={() => setIsDetailDialogOpen(false)}>
                    {t('common:buttons.close', '닫기')}
                  </Button>
                </div>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
