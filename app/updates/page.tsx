"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Heart,
  ArrowLeft,
  FileText,
  Pill,
  Shield,
  Lightbulb,
  Calendar,
  TrendingUp,
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
  featured: boolean
  readCount: number
}

export default function UpdatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [updates, setUpdates] = useState<Update[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      loadUpdates()
    }
  }, [status, router])

  const loadUpdates = async () => {
    try {
      const response = await fetch("/api/updates")
      if (response.ok) {
        const data = await response.json()
        setUpdates(data)
      }
    } catch (error) {
      console.error("Error al cargar actualizaciones:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando actualizaciones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Heart className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">PharmaGraph</h1>
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-blue-100 px-6 py-3 rounded-full mb-4">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <span className="text-lg font-bold text-blue-700">Actualizaciones Mensuales</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              📬 Actualización de 5 Minutos
            </h2>
            <p className="text-xl text-gray-600">
              Lo último en medicamentos biológicos, recordatorios y tips prácticos
            </p>
          </div>

          {/* Lista de Actualizaciones */}
          {updates.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Próximamente
              </h3>
              <p className="text-gray-600">
                Las actualizaciones mensuales estarán disponibles pronto.
                Cada mes recibirás:
              </p>
              <ul className="mt-4 text-left max-w-md mx-auto space-y-2">
                <li className="flex items-start gap-2 text-gray-700">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                  <span>Cambios en fichas técnicas relevantes</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <Pill className="w-5 h-5 text-green-600 mt-0.5" />
                  <span>Nuevos biológicos aprobados</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <Shield className="w-5 h-5 text-purple-600 mt-0.5" />
                  <span>Recordatorios de screening y vacunas</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <span>Tips farmacéuticos de consulta</span>
                </li>
              </ul>
            </div>
          ) : (
            <div className="space-y-6">
              {updates.map((update) => (
                <div
                  key={update.id}
                  className={`bg-white rounded-xl shadow-lg overflow-hidden ${
                    update.featured ? "ring-2 ring-blue-400" : ""
                  }`}
                >
                  {/* Header de la actualización */}
                  <div className={`p-6 ${update.featured ? "bg-gradient-to-r from-blue-50 to-purple-50" : "bg-gray-50"}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        {update.featured && (
                          <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full mb-2">
                            ✨ DESTACADO
                          </span>
                        )}
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">
                          {update.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {update.month}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            5 min de lectura
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-6 space-y-6">
                    {/* Cambios en Fichas Técnicas */}
                    {update.ftChanges.length > 0 && (
                      <div>
                        <h4 className="flex items-center gap-2 font-bold text-gray-900 mb-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                          Cambios en Fichas Técnicas
                        </h4>
                        <ul className="space-y-2">
                          {update.ftChanges.map((change, index) => (
                            <li key={index} className="flex items-start gap-2 text-gray-700 pl-4">
                              <span className="text-blue-600 font-bold">•</span>
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Nuevos Medicamentos */}
                    {update.newMedications.length > 0 && (
                      <div>
                        <h4 className="flex items-center gap-2 font-bold text-gray-900 mb-3">
                          <Pill className="w-5 h-5 text-green-600" />
                          Nuevos Biológicos Aprobados
                        </h4>
                        <ul className="space-y-2">
                          {update.newMedications.map((med, index) => (
                            <li key={index} className="flex items-start gap-2 text-gray-700 pl-4">
                              <span className="text-green-600 font-bold">•</span>
                              <span>{med}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recordatorios */}
                    {update.screeningReminders.length > 0 && (
                      <div>
                        <h4 className="flex items-center gap-2 font-bold text-gray-900 mb-3">
                          <Shield className="w-5 h-5 text-purple-600" />
                          Recordatorios de Screening y Vacunas
                        </h4>
                        <ul className="space-y-2">
                          {update.screeningReminders.map((reminder, index) => (
                            <li key={index} className="flex items-start gap-2 text-gray-700 pl-4">
                              <span className="text-purple-600 font-bold">•</span>
                              <span>{reminder}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Tips Clínicos */}
                    {update.clinicalTips.length > 0 && (
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <h4 className="flex items-center gap-2 font-bold text-gray-900 mb-3">
                          <Lightbulb className="w-5 h-5 text-yellow-600" />
                          💡 Tips Farmacéuticos del Mes
                        </h4>
                        <ul className="space-y-2">
                          {update.clinicalTips.map((tip, index) => (
                            <li key={index} className="flex items-start gap-2 text-gray-700">
                              <span className="text-yellow-600 font-bold">→</span>
                              <span className="font-medium">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Publicado el {new Date(update.publishDate).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="text-sm text-gray-500">
                      {update.readCount} lecturas
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA Footer */}
          <div className="mt-12 text-center bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              ¿No quieres perderte ninguna actualización?
            </h3>
            <p className="text-gray-600 mb-4">
              Cada mes publicamos nueva información relevante para tu práctica clínica
            </p>
            <p className="text-sm text-gray-500">
              Las actualizaciones aparecen automáticamente aquí cuando se publican
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
