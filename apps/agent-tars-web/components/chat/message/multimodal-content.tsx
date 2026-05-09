'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { X } from 'lucide-react'

interface MultimodalContentProps {
  images: string[]
}

export function MultimodalContent({ images }: MultimodalContentProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  if (images.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 justify-end">
      {images.map((url, index) => (
        <Dialog key={index}>
          <DialogTrigger asChild>
            <button className="relative overflow-hidden rounded-lg border border-border hover:border-primary transition-colors">
              <Image
                src={url}
                alt={`Attached image ${index + 1}`}
                width={120}
                height={80}
                className="object-cover"
                unoptimized={url.startsWith('data:')}
              />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
            <Image
              src={url}
              alt={`Attached image ${index + 1}`}
              width={1200}
              height={800}
              className="rounded-lg object-contain max-h-[80vh] w-auto mx-auto"
              unoptimized={url.startsWith('data:')}
            />
          </DialogContent>
        </Dialog>
      ))}
    </div>
  )
}
