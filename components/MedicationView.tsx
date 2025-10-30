"use client"

import { useState } from "react"
import { User, Stethoscope, Printer, Check } from "lucide-react"
import PatientInfographic from "./PatientInfographic"
import ProfessionalInfographic from "./ProfessionalInfographic"

interface HospitalSettings {
  hospitalName?: string
  departmentName?: string
  logoUrl?: string | null
  contactPhone?: string
  contactEmail?: string
  customFooter?: string
  primaryColor?: string
}

interface MedicationViewProps {
  medication: any
  hospitalSettings: HospitalSettings | null
}

export default function MedicationView({ medication, hospitalSettings }: MedicationViewProps) {
  const [patientName, setPatientName] = useState("")
  const [downloadCode, setDownloadCode] = useState<string | null>(null)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [printType, setPrintType] = useState<"patient" | "professional" | null>(null)

  const handlePrint = async (type: "patient" | "professional") => {
    setGeneratingCode(true)
    setPrintType(type)

    try {
      const response = await fetch("/api/download-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          medicationId: medication.id,
          medicationName: medication.name,
          patientName: patientName || null,
          infographicType: type,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setDownloadCode(data.downloadCode)

        // Scroll a la sección correspondiente antes de imprimir
        const sectionId = type === "patient" ? "patient-section" : "professional-section"
        const section = document.getElementById(sectionId)
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "start" })
        }

        setTimeout(() => {
          window.print()
        }, 800)
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setGeneratingCode(false)
      setPrintType(null)
    }
  }

  return (
    <>
      {/* Controles de Impresión */}
      <div className="mb-8 print:hidden">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-3xl mx-auto">
          {/* Nombre del Paciente */}
          <div className="mb-6">
            <label htmlFor="patientName" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Paciente (Opcional para impresión)
            </label>
            <input
              id="patientName"
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Juan Pérez García"
            />
          </div>

          {/* Botones de Impresión */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Versión Paciente */}
            <button
              onClick={() => handlePrint("patient")}
              disabled={generatingCode}
              className="flex items-center justify-center gap-3 p-6 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all bg-gradient-to-br from-blue-50 to-blue-100 disabled:opacity-50"
            >
              <Printer className="w-6 h-6 text-blue-600" />
              <div className="text-left">
                <div className="font-bold text-gray-900 text-lg">🧾 Versión Paciente</div>
                <div className="text-sm text-gray-600">Imprimir para entregar</div>
              </div>
              {generatingCode && printType === "patient" && (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin ml-auto" />
              )}
            </button>

            {/* Versión Profesional */}
            <button
              onClick={() => handlePrint("professional")}
              disabled={generatingCode}
              className="flex items-center justify-center gap-3 p-6 rounded-xl border-2 border-gray-300 hover:border-gray-400 hover:shadow-md transition-all bg-gradient-to-br from-gray-50 to-gray-100 disabled:opacity-50"
            >
              <Printer className="w-6 h-6 text-gray-700" />
              <div className="text-left">
                <div className="font-bold text-gray-900 text-lg">📋 Versión Profesional</div>
                <div className="text-sm text-gray-600">Imprimir para archivo</div>
              </div>
              {generatingCode && printType === "professional" && (
                <div className="w-5 h-5 border-2 border-gray-700 border-t-transparent rounded-full animate-spin ml-auto" />
              )}
            </button>
          </div>

          {/* Código generado */}
          {downloadCode && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    ✅ Código de trazabilidad generado
                  </p>
                  <p className="text-lg font-mono font-bold text-green-700 mt-1">
                    {downloadCode}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Este código aparecerá en la infografía impresa con QR escaneable
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="mb-8 print:hidden">
        <div className="bg-white rounded-xl shadow-md p-2 max-w-md mx-auto">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                const el = document.getElementById('patient-section')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium"
            >
              <User className="w-5 h-5" />
              Versión Paciente
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('professional-section')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors font-medium"
            >
              <Stethoscope className="w-5 h-5" />
              Versión Profesional
            </button>
          </div>
        </div>
      </div>

      {/* Infografía Paciente */}
      <section id="patient-section" className="mb-20 scroll-mt-24">
        <div className="text-center mb-8 print:hidden">
          <div className="inline-flex items-center gap-2 bg-blue-100 px-6 py-3 rounded-full mb-4">
            <User className="w-6 h-6 text-blue-700" />
            <span className="text-xl font-bold text-blue-700">Versión Paciente</span>
          </div>
          <p className="text-gray-600">
            Infografía clara y visual para entregar al paciente
          </p>
        </div>
        <PatientInfographic
          medication={medication}
          patientName={patientName || undefined}
          downloadCode={downloadCode || undefined}
          hospitalSettings={hospitalSettings || undefined}
        />
      </section>

      {/* Separador */}
      <div className="my-20 border-t-2 border-gray-300 print:hidden"></div>

      {/* Infografía Profesional */}
      <section id="professional-section" className="mb-20 scroll-mt-24">
        <div className="text-center mb-8 print:hidden">
          <div className="inline-flex items-center gap-2 bg-gray-100 px-6 py-3 rounded-full mb-4">
            <Stethoscope className="w-6 h-6 text-gray-700" />
            <span className="text-xl font-bold text-gray-700">Versión Profesional</span>
          </div>
          <p className="text-gray-600">
            Infografía técnica y compacta para consulta clínica
          </p>
        </div>
        <ProfessionalInfographic
          medication={medication}
          patientName={patientName || undefined}
          downloadCode={downloadCode || undefined}
          hospitalSettings={hospitalSettings || undefined}
        />
      </section>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  )
}
