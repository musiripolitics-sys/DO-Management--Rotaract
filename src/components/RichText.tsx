'use client'

import { useEffect, useRef } from 'react'
import { Bold, Italic, Underline, List, ListOrdered, Link2 } from 'lucide-react'

/* ────────────────────────────────────────────────────────────────
 * Minimal contentEditable rich-text editor — no external deps.
 * Stores an HTML string. Good enough for announcements / notices.
 * ────────────────────────────────────────────────────────────── */

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function RichText({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  // Sync incoming value only when it differs (avoids caret jumps while typing)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || ''
    }
  }, [value])

  const exec = (command: string, arg?: string) => {
    document.execCommand(command, false, arg)
    if (ref.current) onChange(ref.current.innerHTML)
    ref.current?.focus()
  }

  const addLink = () => {
    const url = window.prompt('Link URL (https://…)')
    if (url) exec('createLink', url)
  }

  const btn =
    'w-8 h-8 inline-flex items-center justify-center rounded-md text-[#1A1815]/60 hover:text-[#6D28D9] hover:bg-[#F5F3FF] transition-colors'

  return (
    <div className="rounded-xl border border-[#1A1815]/12 bg-white focus-within:border-[#6D28D9]/50 focus-within:ring-2 focus-within:ring-[#6D28D9]/15 overflow-hidden transition">
      <div className="flex items-center gap-0.5 border-b border-[#1A1815]/8 bg-[#FAFAF9] px-2 py-1.5">
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')} title="Bold"><Bold className="w-4 h-4" /></button>
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')} title="Italic"><Italic className="w-4 h-4" /></button>
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('underline')} title="Underline"><Underline className="w-4 h-4" /></button>
        <span className="w-px h-5 bg-[#1A1815]/10 mx-1" />
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertUnorderedList')} title="Bullet list"><List className="w-4 h-4" /></button>
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertOrderedList')} title="Numbered list"><ListOrdered className="w-4 h-4" /></button>
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={addLink} title="Link"><Link2 className="w-4 h-4" /></button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        data-placeholder={placeholder || 'Type here…'}
        className="rich-editor min-h-[110px] px-4 py-3 text-sm text-[#1A1815] outline-none leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#6D28D9] [&_a]:underline"
      />
      <style jsx global>{`
        .rich-editor:empty:before {
          content: attr(data-placeholder);
          color: rgba(26, 24, 21, 0.35);
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
