'use client'

interface UserMessageProps {
  content: string
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2 text-primary-foreground max-w-[80%]">
      <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
    </div>
  )
}
