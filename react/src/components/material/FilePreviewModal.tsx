import {
  X,
  Download,
  Heart,
  Star,
  Info,
  Copy,
  ExternalLink,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { getFileServiceUrl, getFileInfoApi } from '@/api/settings'
import { useTranslation } from 'react-i18next'

interface FileInfo {
  name: string
  path: string
  type: string
  size: number
  mtime: number
  ctime: number
  is_directory: boolean
  is_media: boolean
  mime_type: string
}

interface FilePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  filePath: string
  fileName: string
  fileType: string
}

export default function FilePreviewModal({
  isOpen,
  onClose,
  filePath,
  fileName,
  fileType,
}: FilePreviewModalProps) {
  const { t } = useTranslation()
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    if (isOpen && filePath) {
      loadFileInfo()
    }
  }, [isOpen, filePath])

  const loadFileInfo = async () => {
    setLoading(true)
    setError(null)

    try {
      const info = await getFileInfoApi(filePath)
      setFileInfo(info)
    } catch (err) {
      setError('Failed to load file info')
      console.error('Error loading file info:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = getFileServiceUrl(filePath)
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCopyPath = () => {
    navigator.clipboard.writeText(filePath)
    // 可以添加提示消息
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 5))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.25))
  }

  const resetZoom = () => {
    setZoom(1)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-7xl max-h-[95vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {fileName}
            </h2>
            {fileInfo && (
              <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                {formatFileSize(fileInfo.size)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {fileType === 'image' && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={t('material.buttons.zoomOut')}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={resetZoom}
                  className="px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={t('material.buttons.resetZoom')}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={handleZoomIn}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={t('material.buttons.zoomIn')}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`p-2 rounded-lg transition-colors ${
                showInfo
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={t('material.buttons.fileInfo')}
            >
              <Info className="w-4 h-4" />
            </button>

            <button
              onClick={handleCopyPath}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={t('material.buttons.copyPath')}
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={t('material.buttons.download')}
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={t('material.buttons.addToFavorites')}
            >
              <Heart className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main content */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            {loading && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">{t('material.filePreview.loading')}</p>
              </div>
            )}

            {error && (
              <div className="text-center text-red-500">
                <p>{t('material.filePreview.loadFailed')}: {error}</p>
              </div>
            )}

            {!loading && !error && fileType === 'image' && (
              <img
                src={getFileServiceUrl(filePath)}
                alt={fileName}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
                onError={(e) => {
                  console.error('Failed to load image:', e)
                  setError(t('material.filePreview.imageLoadFailed'))
                }}
              />
            )}

            {!loading && !error && fileType === 'video' && (
              <video
                src={getFileServiceUrl(filePath)}
                controls
                className="max-w-full max-h-full"
                style={{ transform: `scale(${zoom})` }}
                onError={(e) => {
                  console.error('Failed to load video:', e)
                  setError(t('material.filePreview.videoLoadFailed'))
                }}
              />
            )}
          </div>

          {/* Info panel */}
          {showInfo && fileInfo && (
            <div className="w-80 border-l border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
              <h3 className="font-bold text-lg mb-4">{t('material.filePreview.fileInfo')}</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('material.filePreview.fileName')}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white break-all">
                    {fileInfo.name}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Path
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white break-all">
                    {fileInfo.path}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('material.filePreview.fileType')}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {fileInfo.mime_type}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('material.filePreview.fileSize')}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatFileSize(fileInfo.size)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('material.filePreview.modifiedAt')}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDate(fileInfo.mtime)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    创建时间
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDate(fileInfo.ctime)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
