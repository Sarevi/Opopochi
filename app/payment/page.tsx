"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Heart, CreditCard, CheckCircle, Shield, Lock } from "lucide-react"

export default function PaymentPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    router.push("/login")
    return null
  }

  const handlePayment = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al procesar el pago")
        setLoading(false)
        return
      }

      // Redirigir a Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      setError("Error al conectar con el servidor de pagos")
      setLoading(false)
    }
  }

  // Si el usuario ya ha pagado, redirigir al dashboard
  if ((session?.user as any)?.hasPaid) {
    router.push("/dashboard")
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">PharmaGraph</h1>
          </Link>
          <div className="text-sm text-gray-600">
            {session?.user?.name || session?.user?.email}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Acceso Completo
            </h2>
            <p className="text-xl text-gray-600">
              Pago único de 5€ para acceso ilimitado a todas las infografías
            </p>
          </div>

          {/* Payment Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            {/* Price */}
            <div className="text-center mb-8 pb-8 border-b">
              <div className="text-6xl font-bold text-blue-600 mb-2">5€</div>
              <p className="text-gray-600">Pago único - Sin suscripciones</p>
            </div>

            {/* Features */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Acceso completo</p>
                  <p className="text-sm text-gray-600">Todas las infografías de medicamentos biológicos</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Dos versiones por medicamento</p>
                  <p className="text-sm text-gray-600">Versión paciente y versión profesional</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Organizadas por patologías</p>
                  <p className="text-sm text-gray-600">Encuentra rápidamente lo que necesitas</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Actualizaciones continuas</p>
                  <p className="text-sm text-gray-600">Contenido basado en fichas técnicas oficiales</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Formatos optimizados</p>
                  <p className="text-sm text-gray-600">Para imprimir en A4 o visualizar en móvil</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-5 h-5" />
              {loading ? "Procesando..." : "Pagar con tarjeta"}
            </button>

            {/* Security Badge */}
            <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Pago seguro</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Stripe</span>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-gray-600">
            <p>Al realizar el pago, aceptas nuestros términos de servicio.</p>
            <p className="mt-2">El pago es procesado de forma segura por Stripe.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
