import { useState, useCallback } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'

interface LightboxImage {
  src: string
  alt?: string
  width?: number
  height?: number
}

interface FileLightboxProps {
  images: LightboxImage[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

export function FileLightbox({
  images,
  initialIndex = 0,
  isOpen,
  onClose
}: FileLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const slides = images.map(img => ({
    src: img.src,
    alt: img.alt,
    width: img.width,
    height: img.height
  }))

  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      slides={slides}
      index={currentIndex}
      on={{
        view: ({ index }) => setCurrentIndex(index)
      }}
      plugins={[Zoom]}
      zoom={{
        maxZoomPixelRatio: 4,
        zoomInMultiplier: 2,
        doubleTapDelay: 300,
        doubleClickDelay: 300,
        doubleClickMaxStops: 2,
        keyboardMoveDistance: 50,
        wheelZoomDistanceFactor: 100,
        pinchZoomDistanceFactor: 100,
        scrollToZoom: true
      }}
      styles={{
        container: { backgroundColor: 'rgba(0, 0, 0, 0.95)' }
      }}
      carousel={{
        finite: images.length <= 1
      }}
      render={{
        buttonPrev: images.length <= 1 ? () => null : undefined,
        buttonNext: images.length <= 1 ? () => null : undefined
      }}
    />
  )
}

// Hook for managing lightbox state
export function useLightbox() {
  const [isOpen, setIsOpen] = useState(false)
  const [images, setImages] = useState<LightboxImage[]>([])
  const [initialIndex, setInitialIndex] = useState(0)

  const openLightbox = useCallback((imgs: LightboxImage[], index = 0) => {
    setImages(imgs)
    setInitialIndex(index)
    setIsOpen(true)
  }, [])

  const closeLightbox = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    images,
    initialIndex,
    openLightbox,
    closeLightbox
  }
}
