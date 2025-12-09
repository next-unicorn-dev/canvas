import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/dialog'
import CommonDialogContent from '@/components/common/DialogContent'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TCanvasAddImagesToChatEvent } from '@/lib/event'
import { useTranslation } from 'react-i18next'
import { X, Instagram, Hash, MapPin, Loader2, AlertCircle } from 'lucide-react'
import { useCanvas } from '@/contexts/canvas'
import { uploadToInstagram, getInstagramStatus, type InstagramStatusResponse } from '@/api/instagram'
import { toast } from 'sonner'
import InstagramConnectDialog from './InstagramConnectDialog'
import { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { exportToCanvas } from '@excalidraw/excalidraw'

interface InstagramUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedImages: TCanvasAddImagesToChatEvent
  selectedElements?: OrderedExcalidrawElement[]
}

export default function InstagramUploadDialog({
  open,
  onOpenChange,
  selectedImages,
  selectedElements = [],
}: InstagramUploadDialogProps) {
  const { t } = useTranslation()
  const { excalidrawAPI } = useCanvas()
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [location, setLocation] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [instagramStatus, setInstagramStatus] = useState<InstagramStatusResponse | null>(null)
  const [showConnectDialog, setShowConnectDialog] = useState(false)

  // Get image URLs from selected images or convert elements to image
  useEffect(() => {
    if (!open || !excalidrawAPI) return

    const loadImages = async () => {
      const urls: string[] = []
      const files = excalidrawAPI.getFiles()
      const appState = excalidrawAPI.getAppState()
      
      // If there are selectedElements (frame or multiple elements), convert to image
      if (selectedElements && selectedElements.length > 0) {
        try {
          // Get all elements from the canvas
          const allElements = excalidrawAPI.getSceneElements()
          
          // Check if any selected element is a frame
          const selectedFrames = selectedElements.filter(el => el.type === 'frame')
          
          // If there are frames, we need to include all elements inside those frames
          let elementsToExport = [...selectedElements]
          
          if (selectedFrames.length > 0) {
            // For each frame, find all elements that belong to it
            for (const frame of selectedFrames) {
              const frameChildren = allElements.filter(
                el => 'frameId' in el && el.frameId === frame.id
              )
              // Add children that are not already in the list
              for (const child of frameChildren) {
                if (!elementsToExport.find(el => el.id === child.id)) {
                  elementsToExport.push(child)
                }
              }
            }
          }
          
          console.log('Exporting elements:', elementsToExport.length, 'elements (including frame children)')

          const canvas = await exportToCanvas({
            elements: elementsToExport,
            appState: {
              ...appState,
              selectedElementIds: {},
            },
            files,
            mimeType: 'image/png',
            maxWidthOrHeight: 2048,
            quality: 1,
          })

          const base64 = canvas.toDataURL('image/png', 0.9)
          urls.push(base64)
        } catch (error) {
          console.error('Failed to export elements to canvas:', error)
          toast.error('Failed to convert elements to image')
        }
      } else if (selectedImages.length > 0) {
        // Original image loading logic
        for (const image of selectedImages) {
          if (image.base64) {
            // Use base64 directly
            urls.push(image.base64)
          } else {
            // The fileId from pop-bar might be:
            // 1. The actual excalidraw file ID (for base64 images)
            // 2. The filename extracted from URL (for non-base64 images)
            let file = files[image.fileId]
            
            // If not found directly, search through all files
            if (!file && files) {
              const fileEntries = Object.entries(files)
              for (const [fileId, fileData] of fileEntries) {
                // Check multiple matching strategies:
                // 1. Direct fileId match
                // 2. File ID match
                // 3. dataURL ends with the fileId (filename)
                // 4. dataURL contains the fileId
                const dataURL = fileData.dataURL || ''
                const fileIdFromURL = dataURL.split('/').pop()?.split('?')[0] // Get filename from URL
                
                if (
                  fileId === image.fileId ||
                  fileData.id === image.fileId ||
                  fileIdFromURL === image.fileId ||
                  dataURL.includes(image.fileId)
                ) {
                  file = fileData
                  break
                }
              }
            }
            
            if (file?.dataURL) {
              const dataURL = file.dataURL
              // Handle different URL formats
              if (dataURL.startsWith('data:')) {
                // Base64 data URL
                urls.push(dataURL)
              } else if (dataURL.startsWith('http://') || dataURL.startsWith('https://')) {
                // Absolute URL
                urls.push(dataURL)
              } else if (dataURL.startsWith('/')) {
                // Relative URL - make it absolute
                urls.push(`${window.location.origin}${dataURL}`)
              } else {
                // Fallback: construct URL
                urls.push(`${window.location.origin}/${dataURL}`)
              }
            } else {
              // Last resort: try to construct URL from fileId
              console.warn('Could not find file for fileId:', image.fileId, 'Available files:', Object.keys(files))
              // Try to use fileId as a direct URL path
              if (image.fileId.startsWith('http://') || image.fileId.startsWith('https://') || image.fileId.startsWith('data:')) {
                urls.push(image.fileId)
              } else {
                // Assume it's a filename and construct API URL
                urls.push(`${window.location.origin}/api/file/${image.fileId}`)
              }
            }
          }
        }
      }
      
      console.log('Loaded image URLs:', urls)
      setImageUrls(urls)
    }

    loadImages()
  }, [open, selectedImages, selectedElements, excalidrawAPI])

  // Load Instagram connection status
  useEffect(() => {
    if (open) {
      loadInstagramStatus()
    }
  }, [open])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setCaption('')
      setHashtags('')
      setLocation('')
      setImageUrls([])
      setUploading(false)
    }
  }, [open])

  const loadInstagramStatus = async () => {
    try {
      const status = await getInstagramStatus()
      setInstagramStatus(status)
    } catch (error) {
      console.error('Failed to load Instagram status:', error)
      setInstagramStatus({
        status: 'error',
        connected: false,
        valid: false,
        username: null,
      })
    }
  }

  const handleUpload = async () => {
    // Check if Instagram is connected
    if (!instagramStatus?.connected || !instagramStatus?.valid) {
      toast.error('Please connect your Instagram account first')
      setShowConnectDialog(true)
      return
    }

    if (imageUrls.length === 0) {
      toast.error('No images to upload')
      return
    }

    // Instagram Graph API는 한 번에 하나의 이미지만 업로드 가능
    // 여러 이미지가 있으면 첫 번째 이미지만 업로드
    const imageUrl = imageUrls[0]

    try {
      setUploading(true)
      
      // Base64 이미지를 서버에 업로드하여 공개 URL로 변환
      let publicImageUrl = imageUrl
      if (imageUrl.startsWith('data:')) {
        // Base64 이미지를 서버에 업로드
        const formData = new FormData()
        const blob = await fetch(imageUrl).then(r => r.blob())
        formData.append('file', blob, 'image.png')
        
        const uploadResponse = await fetch('/api/upload_image', {
          method: 'POST',
          body: formData,
        })
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image to server')
        }
        
        const uploadData = await uploadResponse.json()
        publicImageUrl = uploadData.url || uploadData.file_url || imageUrl
      }

      // Instagram에 업로드
      await uploadToInstagram({
        image_url: publicImageUrl,
        caption,
        hashtags,
        location,
      })

      toast.success('Image uploaded to Instagram successfully!')
      
      // Close dialog and clear selection
      onOpenChange(false)
      excalidrawAPI?.updateScene({
        appState: { selectedElementIds: {} },
      })
    } catch (error: any) {
      console.error('Failed to upload to Instagram:', error)
      toast.error(`Failed to upload: ${error.message || error}`)
    } finally {
      setUploading(false)
    }
  }

  const formatHashtags = (tags: string) => {
    // Remove # if user types it, we'll add it back
    return tags
      .split(/\s+/)
      .filter(tag => tag.trim())
      .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
      .join(' ')
  }

  const handleHashtagsChange = (value: string) => {
    setHashtags(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <CommonDialogContent
        open={open}
        className="flex flex-col p-0 gap-0 w-[90vw] max-w-6xl h-[90vh] max-h-[800px] rounded-lg border bg-background shadow-lg"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Instagram className="w-5 h-5" />
            <h2 className="text-xl font-semibold">
              {t('canvas:instagram.uploadTitle', 'Upload to Instagram')}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left side - Upload settings */}
          <div className="w-1/2 border-r flex flex-col">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                {/* Caption */}
                <div className="space-y-2">
                  <Label htmlFor="caption">
                    {t('canvas:instagram.caption', 'Caption')}
                  </Label>
                  <Textarea
                    id="caption"
                    placeholder={t(
                      'canvas:instagram.captionPlaceholder',
                      'Write a caption...'
                    )}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="min-h-[120px] resize-none"
                    maxLength={2200}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {caption.length}/2200
                  </div>
                </div>

                {/* Hashtags */}
                <div className="space-y-2">
                  <Label htmlFor="hashtags" className="flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    {t('canvas:instagram.hashtags', 'Hashtags')}
                  </Label>
                  <Textarea
                    id="hashtags"
                    placeholder={t(
                      'canvas:instagram.hashtagsPlaceholder',
                      'Add hashtags (separated by spaces)'
                    )}
                    value={hashtags}
                    onChange={(e) => handleHashtagsChange(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                  <div className="text-xs text-muted-foreground">
                    {t(
                      'canvas:instagram.hashtagsHint',
                      'Hashtags will be automatically prefixed with #'
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {t('canvas:instagram.location', 'Location')}
                  </Label>
                  <Input
                    id="location"
                    placeholder={t(
                      'canvas:instagram.locationPlaceholder',
                      'Add location'
                    )}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                {/* Image info */}
                <div className="space-y-2">
                  <Label>
                    {t('canvas:instagram.imageInfo', 'Image Information')}
                  </Label>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {selectedElements && selectedElements.length > 0 ? (
                      <>
                        <div>
                          {t('canvas:instagram.contentType', 'Content Type')}:{' '}
                          {selectedElements.length === 1 && selectedElements[0].type === 'frame'
                            ? t('canvas:instagram.frame', 'Frame')
                            : t('canvas:instagram.multipleElements', 'Multiple Elements')}
                        </div>
                        <div>
                          {t('canvas:instagram.elementCount', 'Elements')}:{' '}
                          {selectedElements.length}
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          {t('canvas:instagram.imageCount', 'Images')}:{' '}
                          {selectedImages.length}
                        </div>
                        {selectedImages.length > 0 && (
                          <div>
                            {t('canvas:instagram.dimensions', 'Dimensions')}:{' '}
                            {selectedImages[0].width} × {selectedImages[0].height}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Footer with upload button */}
            <div className="p-4 border-t space-y-3">
              {!instagramStatus?.connected && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 flex-1">
                    {t('canvas:instagram.notConnected', 'Instagram account not connected')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConnectDialog(true)}
                  >
                    {t('canvas:instagram.connect', 'Connect')}
                  </Button>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
                  {t('canvas:instagram.cancel', 'Cancel')}
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !instagramStatus?.connected || !instagramStatus?.valid}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('canvas:instagram.uploading', 'Uploading...')}
                    </>
                  ) : (
                    <>
                      <Instagram className="w-4 h-4 mr-2" />
                      {t('canvas:instagram.upload', 'Upload')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Right side - Image preview */}
          <div className="w-1/2 flex flex-col bg-muted/30">
            <div className="p-4 border-b">
              <Label className="text-sm font-medium">
                {t('canvas:instagram.preview', 'Preview')}
              </Label>
            </div>
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {imageUrls.length > 0 ? (
                  imageUrls.map((url, index) => (
                    <div
                      key={index}
                      className="relative rounded-lg overflow-hidden border bg-background shadow-sm min-h-[200px] flex items-center justify-center"
                    >
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-auto max-h-[600px] object-contain"
                        onError={(e) => {
                          console.error('Failed to load image:', url, e)
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            parent.innerHTML = `
                              <div class="flex flex-col items-center justify-center p-8 text-muted-foreground">
                                <p class="text-sm">Failed to load image</p>
                                <p class="text-xs mt-2">${url.substring(0, 50)}...</p>
                              </div>
                            `
                          }
                        }}
                      />
                      {selectedImages[index] && (
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {selectedImages[index].width} ×{' '}
                          {selectedImages[index].height}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
                    <div className="text-center">
                      <p>{t('canvas:instagram.loading', 'Loading images...')}</p>
                      <p className="text-xs mt-2">Selected: {selectedImages.length} image(s)</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CommonDialogContent>
      <InstagramConnectDialog
        open={showConnectDialog}
        onOpenChange={(open) => {
          setShowConnectDialog(open)
          if (!open) {
            loadInstagramStatus()
          }
        }}
      />
    </Dialog>
  )
}

