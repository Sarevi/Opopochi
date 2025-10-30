"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Heart, ArrowLeft, Upload, Save, Building2, Phone, Mail, MapPin, Palette, Loader2 } from "lucide-react"
import Image from "next/image"

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [settings, setSettings] = useState({
    hospitalName: "",
    departmentName: "Servicio de Farmacia Hospitalaria",
    logoUrl: null as string | null,
    contactPhone: "",
    contactEmail: "",
    address: "",
    customFooter: "",
    primaryColor: "#2563eb",
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      loadSettings()
    }
  }, [status, router])

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/hospital-settings")
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error("Error al cargar configuración:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-logo", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al subir el logo")
      }

      const data = await response.json()
      setSettings({ ...settings, logoUrl: data.logoUrl })
      setSuccess("Logo subido correctamente")
    } catch (error: any) {
      setError(error.message || "Error al subir el logo")
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/hospital-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al guardar")
      }

      setSuccess("Configuración guardada correctamente")
      setTimeout(() => setSuccess(""), 3000)
    } catch (error: any) {
      setError(error.message || "Error al guardar la configuración")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Cargando configuración...</p>
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
              Volver al dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              Configuración del Hospital
            </h2>
            <p className="text-xl text-gray-600">
              Personaliza la información que aparecerá en las infografías
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Mensajes */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
                {success}
              </div>
            )}

            {/* Logo del Hospital */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                Logo del Hospital
              </h3>

              <div className="space-y-4">
                {settings.logoUrl && (
                  <div className="flex justify-center p-6 bg-gray-50 rounded-lg">
                    <Image
                      src={settings.logoUrl}
                      alt="Logo del hospital"
                      width={200}
                      height={100}
                      className="max-h-24 w-auto object-contain"
                    />
                  </div>
                )}

                <div>
                  <label className="block w-full">
                    <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 cursor-pointer transition-colors">
                      {uploading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          <span className="text-gray-600">Subiendo...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-gray-600" />
                          <span className="text-gray-600">
                            {settings.logoUrl ? "Cambiar logo" : "Subir logo"}
                          </span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    PNG, JPG o SVG. Máximo 2MB. Recomendado: 300x100px
                  </p>
                </div>
              </div>
            </div>

            {/* Información del Hospital */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Información del Hospital
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="hospitalName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Hospital *
                  </label>
                  <input
                    id="hospitalName"
                    type="text"
                    required
                    value={settings.hospitalName}
                    onChange={(e) => setSettings({ ...settings, hospitalName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Hospital Universitario..."
                  />
                </div>

                <div>
                  <label htmlFor="departmentName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Servicio
                  </label>
                  <input
                    id="departmentName"
                    type="text"
                    value={settings.departmentName}
                    onChange={(e) => setSettings({ ...settings, departmentName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Servicio de Farmacia Hospitalaria"
                  />
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Dirección
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Calle Principal, 123, 28001 Madrid"
                  />
                </div>
              </div>
            </div>

            {/* Información de Contacto */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Información de Contacto
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Teléfono de Contacto
                  </label>
                  <input
                    id="contactPhone"
                    type="tel"
                    value={settings.contactPhone}
                    onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="900 XXX XXX"
                  />
                </div>

                <div>
                  <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email de Contacto
                  </label>
                  <input
                    id="contactEmail"
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="farmacia@hospital.com"
                  />
                </div>
              </div>
            </div>

            {/* Personalización */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Palette className="w-6 h-6 text-blue-600" />
                Personalización
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                    Color Principal
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      id="primaryColor"
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="h-12 w-20 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="#2563eb"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="customFooter" className="block text-sm font-medium text-gray-700 mb-2">
                    Texto Personalizado (Pie de Página)
                  </label>
                  <textarea
                    id="customFooter"
                    value={settings.customFooter}
                    onChange={(e) => setSettings({ ...settings, customFooter: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Texto adicional que aparecerá en el pie de página de las infografías..."
                  />
                </div>
              </div>
            </div>

            {/* Botón de Guardar */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Guardar Configuración
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
