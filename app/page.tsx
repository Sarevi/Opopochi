import Link from "next/link"
import { Heart, Shield, FileText, Users, ArrowRight, CheckCircle } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">PharmaGraph</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Infografías de Medicamentos Biológicos
            <span className="block text-blue-600 mt-2">Para tu Consulta</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Accede a infografías claras y profesionales de medicamentos biológicos.
            Diseñadas para entregar a pacientes y consultar en tu práctica clínica.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg flex items-center justify-center gap-2"
            >
              Comenzar ahora
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-lg"
            >
              Ver más
            </a>
          </div>
          <p className="mt-6 text-gray-500">
            Solo 5€ para acceso completo
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            ¿Qué incluye PharmaGraph?
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Dos versiones</h4>
              <p className="text-gray-600">
                Infografía para paciente (visual y amigable) e infografía profesional (técnica y compacta)
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Organizado por patologías</h4>
              <p className="text-gray-600">
                Neurología, neumología, reumatología y más. Encuentra rápido lo que necesitas
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Actualizado y seguro</h4>
              <p className="text-gray-600">
                Basado en fichas técnicas oficiales y guías clínicas. Con fecha de actualización
              </p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-orange-600" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Práctico</h4>
              <p className="text-gray-600">
                Listo para imprimir en A4 o visualizar en móvil. Formatos optimizados
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Patient vs Professional */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Contenido para cada necesidad
          </h3>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Ficha Paciente */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl shadow-lg">
              <h4 className="text-2xl font-bold text-gray-900 mb-4">
                Versión Paciente
              </h4>
              <ul className="space-y-3">
                {[
                  "Qué es y para qué sirve (lenguaje sencillo)",
                  "Cómo se administra (visual)",
                  "Qué esperar del tratamiento",
                  "Efectos secundarios comunes",
                  "Señales de alarma",
                  "Consejos prácticos",
                  "Contacto del servicio"
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Ficha Profesional */}
            <div className="bg-white border-2 border-gray-200 p-8 rounded-2xl shadow-lg">
              <h4 className="text-2xl font-bold text-gray-900 mb-4">
                Versión Profesional
              </h4>
              <ul className="space-y-3">
                {[
                  "Indicación aprobada",
                  "Posología y esquema",
                  "Requisitos previos (TB, vacunas...)",
                  "Monitorización",
                  "Manejo: retrasos, infecciones, cirugía",
                  "Preparación y conservación",
                  "Perlas prácticas",
                  "Link a ficha técnica oficial"
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-gray-600 mt-1 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-4xl font-bold mb-4">
            Comienza hoy mismo
          </h3>
          <p className="text-xl mb-8 text-blue-100">
            Acceso completo por solo 5€. Sin suscripciones ni costes ocultos.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg"
          >
            Registrarse ahora
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-6 h-6 text-blue-400" />
            <span className="text-white font-semibold text-lg">PharmaGraph</span>
          </div>
          <p className="text-sm">
            Información de consulta. No sustituye el juicio clínico profesional.
          </p>
          <p className="text-sm mt-2">
            © 2025 PharmaGraph. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
