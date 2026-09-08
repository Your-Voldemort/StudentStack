"use client"

import type React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

interface AnimatedShinyButtonProps {
  children: React.ReactNode
  className?: string
  url?: string
  /** Smaller padding/type for dense contexts (e.g. one per card in a grid). */
  compact?: boolean
}

// Styling lives in globals.css (search "AnimatedShinyButton") rather than a
// `<style jsx>` block here — see the comment there for why.
export function AnimatedShinyButton({
  children,
  className = "",
  url,
  compact = false,
}: AnimatedShinyButtonProps) {
  const sizeClass = compact ? "shiny-cta--compact" : ""
  const content = (
    <span className="flex items-center">
      {children}
      <ChevronRight className="ml-1 size-4 shrink-0 transition-all duration-300 ease-out group-hover:translate-x-1" />
    </span>
  )

  if (url?.startsWith("/")) {
    return (
      <Link href={url} className={`shiny-cta-link group ${sizeClass} ${className}`}>
        {content}
      </Link>
    )
  }

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`shiny-cta-link group ${sizeClass} ${className}`}
      >
        {content}
      </a>
    )
  }

  return (
    <button className={`shiny-cta group ${sizeClass} ${className}`}>{content}</button>
  )
}
