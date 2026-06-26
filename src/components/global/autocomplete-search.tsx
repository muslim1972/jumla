"use client"

import { useState, useEffect, useRef } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { Input } from "@/components/ui/input"
import { Loader2, Search, X } from "lucide-react"

export type AutocompleteSearchProps<T> = {
  placeholder?: string
  debounceTime?: number
  minChars?: number
  onSearch: (query: string) => Promise<T[]>
  renderItem: (item: T, index: number, closeDropdown: () => void) => React.ReactNode
  noResultsMessage?: string
  className?: string
  onClear?: () => void
}

export function AutocompleteSearch<T>({
  placeholder = "ابحث...",
  debounceTime = 400,
  minChars = 2,
  onSearch,
  renderItem,
  noResultsMessage = "لا توجد نتائج",
  className = "",
  onClear
}: AutocompleteSearchProps<T>) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  const debouncedQuery = useDebounce(query, debounceTime)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Close dropdown if clicked outside
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (debouncedQuery.trim().length >= minChars) {
      performSearch(debouncedQuery)
    } else {
      setResults([])
      setIsOpen(false)
    }
  }, [debouncedQuery])

  async function performSearch(searchStr: string) {
    setIsLoading(true)
    try {
      const data = await onSearch(searchStr)
      setResults(data)
      setIsOpen(true)
    } catch (error) {
      console.error("Search failed:", error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  function handleClear() {
    setQuery("")
    setResults([])
    setIsOpen(false)
    if (onClear) onClear()
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value.length < minChars) {
              setIsOpen(false)
            }
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          className="h-12 bg-background/50 pl-10 pr-10" // Padding for both icons
        />
        
        {/* Right Icon (Search or Loading) */}
        <div className="absolute right-3 top-3.5 text-muted-foreground">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>

        {/* Left Icon (Clear) */}
        {query.length > 0 && (
          <button 
            onClick={handleClear}
            className="absolute left-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && query.trim().length >= minChars && !isLoading && (
        <div className="absolute z-50 mt-1 w-full bg-card border rounded-xl shadow-lg max-h-80 overflow-y-auto divide-y">
          {results.length > 0 ? (
            results.map((item, index) => renderItem(item, index, () => setIsOpen(false)))
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {noResultsMessage}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
