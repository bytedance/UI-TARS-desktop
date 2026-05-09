'use client'

import Image from 'next/image'
import type { ImageContent } from '@/lib/types'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

interface ImageResultProps {
  content: ImageContent
}

export function ImageResult({ content }: ImageResultProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {content.images.map((image, index) => (
        <Dialog key={index}>
          <DialogTrigger asChild>
            <button className="relative aspect-video rounded-lg border border-border overflow-hidden hover:border-primary transition-colors">
              <Image
                src={image.url}
                alt={image.alt || `Image ${index + 1}`}
                fill
                className="object-cover"
                unoptimized={image.url.startsWith('data:')}
              />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
            <Image
              src={image.url}
              alt={image.alt || `Image ${index + 1}`}
              width={image.width || 1200}
              height={image.height || 800}
              className="rounded-lg object-contain max-h-[80vh] w-auto mx-auto"
              unoptimized={image.url.startsWith('data:')}
            />
          </DialogContent>
        </Dialog>
      ))}
    </div>
  )
}
