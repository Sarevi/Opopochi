"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  TrendingUp,
  FileText,
  Pill,
  Shield,
  Lightbulb,
  ArrowRight,
  Clock
} from "lucide-react"

interface Update {
  id: string
  title: string
  month: string
  publishDate: string
  ftChanges: string[]
  newMedications: string[]
  screeningReminders: string[]
  clinicalTips: string[]
}

export default function UpdatesWidget() {
  const [update, setUpdate] = useState<Update | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFeaturedUpdate()
  }, [])

  const loadFeaturedUpdate = async () => {
    try {
      const response = await fetch("/api/updates?featured=true")
      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          setUpdate(data[0])
        }
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  }

  if (!update) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-full">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">
              📬 Actualizaciones Mensuales
            </h3>
            <p className="text-blue-100 mb-4">
              Mantente al día con lo último en medicamentos biológicos
            </p>
            <Link
              href="/updates"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              Ver actualizaciones
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-lg overflow-hidden border-2 border-blue-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-wide">
            Actualización del Mes
          </span>
        </div>
        <h3 className="text-xl font-bold">{update.title}</h3>
        <div className="flex items-center gap-2 text-sm text-blue-100 mt-1">
          <Clock className="w-4 h-4" />
          <span>5 min de lectura</span>
          <span>•</span>
          <span>{update.month}</span>
        </div>
      </div>

      {/* Content Preview */}
      <div className="p-6 space-y-4">
        {/* Preview de cambios FT */}
        {update.ftChanges.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Cambios en Fichas Técnicas
            </div>
            <ul className="space-y-1">
              {update.ftChanges.slice(0, 2).map((change, index) => (
                <li key={index} className="text-sm text-gray-700 pl-6 flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span className="line-clamp-1">{change}</span>
                </li>
              ))}
            </ul>
            {update.ftChanges.length > 2 && (
              <p className="text-xs text-gray-500 pl-6 mt-1">
                +{update.ftChanges.length - 2} más...
              </p>
            )}
          </div>
        )}

        {/* Preview de nuevos medicamentos */}
        {update.newMedications.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <Pill className="w-4 h-4 text-green-600" />
              Nuevos Biológicos
            </div>
            <ul className="space-y-1">
              {update.newMedications.slice(0, 1).map((med, index) => (
                <li key={index} className="text-sm text-gray-700 pl-6 flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span className="line-clamp-1">{med}</span>
                </li>
              ))}
            </ul>
            {update.newMedications.length > 1 && (
              <p className="text-xs text-gray-500 pl-6 mt-1">
                +{update.newMedications.length - 1} más...
              </p>
            )}
          </div>
        )}

        {/* Preview de tip destacado */}
        {update.clinicalTips.length > 0 && (
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
              <Lightbulb className="w-4 h-4 text-yellow-600" />
              💡 Tip del Mes
            </div>
            <p className="text-sm text-gray-700 line-clamp-2 font-medium">
              {update.clinicalTips[0]}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-white border-t">
        <Link
          href="/updates"
          className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
        >
          Leer actualización completa
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
