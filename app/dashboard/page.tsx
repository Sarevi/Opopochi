import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Heart, LogOut, Brain, Wind, Bone, Heart as HeartIcon, Plus, Settings } from "lucide-react"
import UpdatesWidget from "@/components/UpdatesWidget"
import SearchBar from "@/components/SearchBar"

// Iconos para patologías (puedes expandir esto)
const pathologyIcons: Record<string, any> = {
  neurologia: Brain,
  neumologia: Wind,
  reumatologia: Bone,
  cardiologia: HeartIcon,
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  // Si no ha pagado, redirigir a payment
  if (!(session.user as any).hasPaid) {
    redirect("/payment")
  }

  // Obtener todas las patologías con sus medicamentos
  const pathologies = await prisma.pathology.findMany({
    include: {
      medications: {
        orderBy: {
          name: "asc",
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Heart className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">PharmaGraph</h1>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                {session.user?.name || session.user?.email}
              </span>
              <Link
                href="/settings"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                title="Configuración del hospital"
              >
                <Settings className="w-5 h-5" />
                Configuración
              </Link>
              <Link
                href="/api/auth/signout"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-5 h-5" />
                Salir
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Infografías de Medicamentos Biológicos
          </h2>
          <p className="text-xl text-gray-600 mb-6">
            Selecciona una patología para ver los medicamentos disponibles
          </p>

          {/* Barra de Búsqueda */}
          <div className="max-w-3xl mx-auto">
            <SearchBar />
          </div>
        </div>

        {/* Widget de Actualizaciones */}
        <div className="mb-12">
          <UpdatesWidget />
        </div>

        {pathologies.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-white rounded-2xl shadow-lg p-12 max-w-2xl mx-auto">
              <Plus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                No hay medicamentos disponibles aún
              </h3>
              <p className="text-gray-600 mb-6">
                Estamos trabajando en agregar contenido. Pronto tendrás acceso a todas las infografías.
              </p>
              <p className="text-sm text-gray-500">
                Si eres administrador, inicia sesión con tu cuenta de admin para agregar medicamentos.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {pathologies.map((pathology) => {
              const Icon = pathologyIcons[pathology.slug] || Heart

              return (
                <div key={pathology.id} className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                    <div className="bg-blue-100 p-4 rounded-full">
                      <Icon className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {pathology.name}
                      </h3>
                      {pathology.description && (
                        <p className="text-gray-600 mt-1">{pathology.description}</p>
                      )}
                    </div>
                  </div>

                  {pathology.medications.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No hay medicamentos en esta categoría aún
                    </p>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pathology.medications.map((medication) => (
                        <Link
                          key={medication.id}
                          href={`/medication/${medication.slug}`}
                          className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group"
                        >
                          <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {medication.name}
                          </h4>
                          {medication.genericName && (
                            <p className="text-sm text-gray-500 mt-1">
                              {medication.genericName}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            Actualizado: {new Date(medication.lastUpdated).toLocaleDateString('es-ES')}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-20">
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
