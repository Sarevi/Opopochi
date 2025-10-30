import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Heart, ArrowLeft, Settings as SettingsIcon } from "lucide-react"
import MedicationView from "@/components/MedicationView"

export default async function MedicationPage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (!(session.user as any).hasPaid) {
    redirect("/payment")
  }

  const userId = (session.user as any).id

  // Obtener el medicamento
  const medication = await prisma.medication.findUnique({
    where: {
      slug: params.slug,
    },
    include: {
      pathology: true,
    },
  })

  if (!medication) {
    notFound()
  }

  // Obtener configuración del hospital
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { hospitalSettings: true },
  })

  const hospitalSettings = user?.hospitalSettings || null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 print:hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Heart className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">PharmaGraph</h1>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/settings"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                title="Configurar hospital"
              >
                <SettingsIcon className="w-5 h-5" />
                Configuración
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
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <div className="mb-8 print:hidden">
          <nav className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/dashboard" className="hover:text-gray-900">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/dashboard" className="hover:text-gray-900">
              {medication.pathology.name}
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{medication.name}</span>
          </nav>
        </div>

        {/* Title */}
        <div className="mb-12 text-center print:hidden">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            {medication.name}
          </h2>
          {medication.genericName && (
            <p className="text-xl text-gray-600">({medication.genericName})</p>
          )}
          <p className="text-gray-500 mt-2">
            {medication.pathology.name}
          </p>
        </div>

        {/* Aviso si no tiene configuración del hospital */}
        {!hospitalSettings?.hospitalName && (
          <div className="mb-8 max-w-3xl mx-auto print:hidden">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Personaliza tus infografías:</strong> Ve a{" "}
                <Link href="/settings" className="underline font-semibold">
                  Configuración
                </Link>{" "}
                para agregar el logo de tu hospital y personalizar la información de contacto.
              </p>
            </div>
          </div>
        )}

        <MedicationView
          medication={medication}
          hospitalSettings={hospitalSettings}
        />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-20 print:hidden">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-6 h-6 text-blue-400" />
            <span className="text-white font-semibold text-lg">PharmaGraph</span>
          </div>
          <p className="text-sm">
            Información de consulta. No sustituye el juicio clínico profesional.
          </p>
        </div>
      </footer>
    </div>
  )
}
