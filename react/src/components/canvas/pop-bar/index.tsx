import { useCanvas } from '@/contexts/canvas'
import { TCanvasAddImagesToChatEvent } from '@/lib/event'
import {
  ExcalidrawImageElement,
  OrderedExcalidrawElement,
} from '@excalidraw/excalidraw/element/types'
import { AnimatePresence } from 'motion/react'
import { useRef, useState } from 'react'
import CanvasPopbarContainer from './CanvasPopbarContainer'
import InstagramUploadDialog from '../InstagramUploadDialog'

const CanvasPopbarWrapper = () => {
  const { excalidrawAPI } = useCanvas()

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [showAddToChat, setShowAddToChat] = useState(false)
  const [showMagicGenerate, setShowMagicGenerate] = useState(false)
  const [showInstagramDialog, setShowInstagramDialog] = useState(false)

  const selectedImagesRef = useRef<TCanvasAddImagesToChatEvent>([])
  const selectedElementsRef = useRef<OrderedExcalidrawElement[]>([])
  const selectedElementsForDialogRef = useRef<OrderedExcalidrawElement[]>([])

  excalidrawAPI?.onChange((elements, appState, files) => {
    const selectedIds = appState.selectedElementIds
    if (Object.keys(selectedIds).length === 0) {
      setPos(null)
      setShowAddToChat(false)
      setShowMagicGenerate(false)
      return
    }

    const selectedImages = elements.filter(
      (element) => element.type === 'image' && selectedIds[element.id]
    ) as ExcalidrawImageElement[]

    // Check if frame is selected
    const selectedFrames = elements.filter(
      (element) => element.type === 'frame' && selectedIds[element.id]
    )

    // 判断是否显示添加到对话按钮：선택된 이미지 또는 frame이 있을 때
    const hasSelectedImages = selectedImages.length > 0
    const hasSelectedFrames = selectedFrames.length > 0
    const hasSelectableContent = hasSelectedImages || hasSelectedFrames
    setShowAddToChat(hasSelectableContent)

    // 判断是否显示魔法生成按钮：선택된 요소가 2개 이상일 때 (모든 타입 포함)
    const selectedCount = Object.keys(selectedIds).length
    setShowMagicGenerate(selectedCount >= 2)

    // 如果既没有선택된 콘텐츠，也没有满足魔法生成条件，隐藏弹窗
    if (!hasSelectableContent && selectedCount < 2) {
      setPos(null)
      return
    }

    // 处理选中的图片数据
    selectedImagesRef.current = selectedImages
      .filter((image) => image.fileId)
      .map((image) => {
        const file = files[image.fileId!]
        const isBase64 = file.dataURL.startsWith('data:')
        const id = isBase64 ? file.id : file.dataURL.split('/').at(-1)!
        return {
          fileId: id,
          base64: isBase64 ? file.dataURL : undefined,
          width: image.width,
          height: image.height,
        }
      })

    // 处理选中的元素数据
    selectedElementsRef.current = elements.filter(
      (element) => selectedIds[element.id] && element.index !== null
    ) as OrderedExcalidrawElement[]

    // 计算위치：如果有이미지나 frame，基于이미지/frame；否则基于所有선택된 요소
    let centerX: number
    let bottomY: number

    if (hasSelectedImages || hasSelectedFrames) {
      // 基于선택된 이미지나 frame 计算위치
      const elementsForPosition = [...selectedImages, ...selectedFrames]
      centerX =
        elementsForPosition.reduce((acc, el) => acc + el.x + el.width / 2, 0) /
        elementsForPosition.length

      bottomY = elementsForPosition.reduce(
        (acc, el) => Math.max(acc, el.y + el.height),
        Number.NEGATIVE_INFINITY
      )
    } else {
      // 基于所有선택된 요소 计算위치
      const selectedElements = elements.filter((element) => selectedIds[element.id])

      centerX =
        selectedElements.reduce(
          (acc, element) => acc + element.x + (element.width || 0) / 2,
          0
        ) / selectedElements.length

      bottomY = selectedElements.reduce(
        (acc, element) => Math.max(acc, element.y + (element.height || 0)),
        Number.NEGATIVE_INFINITY
      )
    }

    const scrollX = appState.scrollX
    const scrollY = appState.scrollY
    const zoom = appState.zoom.value
    const offsetX = (scrollX + centerX) * zoom
    const offsetY = (scrollY + bottomY) * zoom
    setPos({ x: offsetX, y: offsetY })
    // console.log(offsetX, offsetY)
  })

  return (
    <>
      <div className='absolute left-0 bottom-0 w-full h-full z-20 pointer-events-none'>
        <AnimatePresence>
          {pos && (showAddToChat || showMagicGenerate) && (
            <CanvasPopbarContainer
              pos={pos}
              selectedImages={selectedImagesRef.current}
              selectedElements={selectedElementsRef.current}
              showAddToChat={showAddToChat}
              showMagicGenerate={showMagicGenerate}
              onInstagramClick={(elements) => {
                selectedElementsForDialogRef.current = elements
                setShowInstagramDialog(true)
              }}
            />
          )}
        </AnimatePresence>
      </div>
      <InstagramUploadDialog
        open={showInstagramDialog}
        onOpenChange={setShowInstagramDialog}
        selectedImages={selectedImagesRef.current}
        selectedElements={selectedElementsForDialogRef.current}
      />
    </>
  )
}

export default CanvasPopbarWrapper
