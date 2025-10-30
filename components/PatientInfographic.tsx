"use client"

import {
  Heart,
  Syringe,
  Clock,
  AlertTriangle,
  CheckCircle,
  Shield,
  Info,
  Phone
} from "lucide-react"
import Image from "next/image"
import QRCodeDisplay from "./QRCodeDisplay"

interface HospitalSettings {
  hospitalName?: string
  departmentName?: string
  logoUrl?: string | null
  contactPhone?: string
  contactEmail?: string
  customFooter?: string
  primaryColor?: string
}

interface PatientInfographicProps {
  medication: {
    name: string
    genericName?: string
    patientDescription: string
    patientAdministration: string
    patientExpectations: string
    patientSideEffects: string[]
    patientWarningsSigns: string[]
    patientBeforeStart: string[]
    patientTips: string[]
    patientContactInfo?: string
    lastUpdated: Date
  }
  patientName?: string
  downloadCode?: string
  hospitalSettings?: HospitalSettings
}

export default function PatientInfographic({
  medication,
  patientName,
  downloadCode,
  hospitalSettings
}: PatientInfographicProps) {
  const primaryColor = hospitalSettings?.primaryColor || "#2563eb"
  const contactInfo = hospitalSettings?.contactPhone || medication.patientContactInfo

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl shadow-lg max-w-4xl mx-auto print:shadow-none">
      {/* Header con Logo y Nombre del Hospital */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {hospitalSettings?.logoUrl && (
              <div className="mb-4">
                <Image
                  src={hospitalSettings.logoUrl}
                  alt={hospitalSettings.hospitalName || "Hospital"}
                  width={150}
                  height={60}
                  className="max-h-16 w-auto object-contain"
                />
              </div>
            )}
            {hospitalSettings?.hospitalName && (
              <div className="mb-2">
                <p className="text-sm font-semibold text-gray-700">
                  {hospitalSettings.hospitalName}
                </p>
                {hospitalSettings.departmentName && (
                  <p className="text-xs text-gray-600">
                    {hospitalSettings.departmentName}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* QR Code */}
          {downloadCode && (
            <div className="print:block hidden">
              <QRCodeDisplay code={downloadCode} size={100} />
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <Heart className="w-6 h-6" style={{ color: primaryColor }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{medication.name}</h1>
              {medication.genericName && (
                <p className="text-gray-600 text-sm">({medication.genericName})</p>
              )}
            </div>
          </div>

          {/* Nombre del Paciente */}
          {patientName && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Paciente:</span> {patientName}
              </p>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2">
            Última actualización: {new Date(medication.lastUpdated).toLocaleDateString('es-ES')}
          </p>
        </div>
      </div>

      {/* ¿Qué es y para qué sirve? */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <Info className="w-5 h-5" style={{ color: primaryColor }} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              ¿Qué es y para qué sirve?
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {medication.patientDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Cómo se administra */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Syringe className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              ¿Cómo se administra?
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {medication.patientAdministration}
            </p>
          </div>
        </div>
      </div>

      {/* Qué esperar */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Clock className="w-6 h-6 text-purple-500 mt-1 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              ¿Qué esperar?
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {medication.patientExpectations}
            </p>
          </div>
        </div>
      </div>

      {/* Efectos secundarios comunes */}
      {medication.patientSideEffects.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                Efectos secundarios comunes
              </h2>
              <ul className="space-y-2">
                {medication.patientSideEffects.map((effect, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700">
                    <span className="text-yellow-600 mt-1">•</span>
                    <span>{effect}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Señales de alarma */}
      {medication.patientWarningsSigns.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                ⚠️ Consulta inmediatamente si...
              </h2>
              <ul className="space-y-2">
                {medication.patientWarningsSigns.map((sign, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700 font-medium">
                    <span className="text-red-600 mt-1">•</span>
                    <span>{sign}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Antes de empezar */}
      {medication.patientBeforeStart.length > 0 && (
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-indigo-500 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                Antes de empezar el tratamiento
              </h2>
              <ul className="space-y-2">
                {medication.patientBeforeStart.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700">
                    <CheckCircle className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Consejos prácticos */}
      {medication.patientTips.length > 0 && (
        <div className="bg-green-50 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                💡 Consejos prácticos
              </h2>
              <ul className="space-y-2">
                {medication.patientTips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700">
                    <span className="text-green-600 mt-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Información de contacto */}
      {contactInfo && (
        <div
          className="rounded-xl p-6 shadow-sm mb-6"
          style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}40` }}
        >
          <div className="flex items-center gap-3">
            <Phone className="w-6 h-6 flex-shrink-0" style={{ color: primaryColor }} />
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                Contacto del servicio
              </h2>
              <p className="text-gray-700 font-medium">
                {contactInfo}
              </p>
              {hospitalSettings?.contactEmail && (
                <p className="text-sm text-gray-600 mt-1">
                  {hospitalSettings.contactEmail}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer personalizado */}
      {hospitalSettings?.customFooter && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700 text-center">
            {hospitalSettings.customFooter}
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <p className="text-xs text-gray-600 text-center">
          Esta información es orientativa y no sustituye el consejo médico.
          Consulta siempre con tu equipo sanitario ante cualquier duda.
        </p>
      </div>
    </div>
  )
}
