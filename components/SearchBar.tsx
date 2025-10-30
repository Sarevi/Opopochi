"use client"

import { useState, useEffect } from "react"
import { Search, X, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Medication {
  id: string
  name: string
  slug: string
  genericName: string | null
  pathology: {
    name: string
  }
}

export default function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Medication[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const searchMedications = async () => {
      if (query.length < 2) {
        setResults([])
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (response.ok) {
          const data = await response.json()
          setResults(data)
        }
      } catch (error) {
        console.error("Error en búsqueda:", error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(searchMedications, 300)
    return () => clearTimeout(debounce)
  }, [query])

  const handleClear = () => {
    setQuery("")
    setResults([])
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClear()
    }
    if (e.key === "Enter" && results.length > 0) {
      router.push(`/medication/${results[0].slug}`)
      handleClear()
    }
  }

  return (
    <div className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar medicamento... (ej: Adalimumab, Metotrexato)"
          className="w-full pl-12 pr-12 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border-2 border-gray-200 max-h-96 overflow-y-auto z-50">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-gray-600 mt-2">Buscando...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((med) => (
                <Link
                  key={med.id}
                  href={`/medication/${med.slug}`}
                  onClick={handleClear}
                  className="block px-6 py-4 hover:bg-blue-50 transition-colors border-b last:border-b-0"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-lg">
                        {med.name}
                      </h4>
                      {med.genericName && (
                        <p className="text-sm text-gray-600 mt-1">
                          {med.genericName}
                        </p>
                      )}
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                      {med.pathology.name}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600">
                No se encontraron medicamentos con "{query}"
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Intenta con otro término de búsqueda
              </p>
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && query.length >= 2 && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleClear}
        />
      )}

      {/* Keyboard Hint */}
      {query.length > 0 && results.length > 0 && (
        <div className="absolute -bottom-6 right-0 text-xs text-gray-500">
          Presiona <kbd className="px-2 py-1 bg-gray-100 border rounded">Enter</kbd> o haz clic
        </div>
      )}
    </div>
  )
}
