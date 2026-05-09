'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface ImagePreviewProps {
  images: string[]
  onRemove: (index: number) => void
}

export function ImagePreview({ images, onRemove }: ImagePreviewProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {images.map((url, index) => (
        <div
          key={index}
          className="relative group rounded-lg overflow-hidden border border-border"
        >
          <Image
            src={url}
            alt={`Attached ${index + 1}`}
            width={80}
            height={60}
            className="object-cover"
            unoptimized={url.startsWith('data:')}
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onRemove(index)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  )
}
