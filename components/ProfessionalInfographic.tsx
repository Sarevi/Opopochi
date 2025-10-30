"use client"

import {
  Stethoscope,
  Pill,
  ClipboardCheck,
  Activity,
  Settings,
  Beaker,
  Lightbulb,
  ExternalLink,
  Calendar
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

interface ProfessionalInfographicProps {
  medication: {
    name: string
    genericName?: string
    professionalIndication: string
    professionalDosage: string
    professionalPrerequisites: string[]
    professionalMonitoring: string[]
    professionalManagement: string
    professionalPreparation: string
    professionalPracticalTips: string[]
    professionalDatasheetLink?: string
    lastUpdated: Date
  }
  patientName?: string
  downloadCode?: string
  hospitalSettings?: HospitalSettings
}

export default function ProfessionalInfographic({
  medication,
  patientName,
  downloadCode,
  hospitalSettings
}: ProfessionalInfographicProps) {
  const primaryColor = hospitalSettings?.primaryColor || "#2563eb"

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto border border-gray-200 print:shadow-none">
      {/* Header con Logo y Nombre del Hospital */}
      <div className="border-b-2 border-gray-300 pb-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {hospitalSettings?.logoUrl && (
              <div className="mb-3">
                <Image
                  src={hospitalSettings.logoUrl}
                  alt={hospitalSettings.hospitalName || "Hospital"}
                  width={120}
                  height={48}
                  className="max-h-12 w-auto object-contain"
                />
              </div>
            )}
            {hospitalSettings?.hospitalName && (
              <div>
                <p className="text-xs font-semibold text-gray-700">
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
              <QRCodeDisplay code={downloadCode} size={80} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <Stethoscope className="w-5 h-5" style={{ color: primaryColor }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{medication.name}</h1>
              {medication.genericName && (
                <p className="text-sm text-gray-600">({medication.genericName})</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">
              <Calendar className="w-3 h-3 inline mr-1" />
              Actualizado: {new Date(medication.lastUpdated).toLocaleDateString('es-ES')}
            </p>
          </div>
        </div>

        {/* Nombre del Paciente */}
        {patientName && (
          <div className="mt-3 p-2 bg-gray-100 rounded">
            <p className="text-xs text-gray-700">
              <span className="font-semibold">Paciente:</span> {patientName}
            </p>
          </div>
        )}
      </div>

      {/* Layout de 2 columnas */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Columna izquierda */}
        <div className="space-y-4">
          {/* Indicación aprobada */}
          <div className="border-l-4 pl-4" style={{ borderColor: primaryColor }}>
            <h2 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide flex items-center gap-2">
              <Pill className="w-4 h-4" />
              Indicación
            </h2>
            <p className="text-sm text-gray-700">{medication.professionalIndication}</p>
          </div>

          {/* Posología */}
          <div className="border-l-4 border-green-600 pl-4">
            <h2 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Posología y esquema
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">{medication.professionalDosage}</p>
          </div>

          {/* Requisitos previos */}
          <div className="border-l-4 border-yellow-600 pl-4">
            <h2 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Requisitos previos
            </h2>
            <ul className="text-sm text-gray-700 space-y-1">
              {medication.professionalPrerequisites.map((req, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold mt-0.5">→</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Preparación y estabilidad */}
          <div className="border-l-4 border-purple-600 pl-4">
            <h2 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide flex items-center gap-2">
              <Beaker className="w-4 h-4" />
              Preparación y conservación
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">{medication.professionalPreparation}</p>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="space-y-4">
          {/* Monitorización */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: `${primaryColor}10` }}>
            <h2 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: primaryColor }} />
              Monitorización
            </h2>
            <ul className="text-sm text-gray-700 space-y-1">
              {medication.professionalMonitoring.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span style={{ color: primaryColor }}>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Manejo básico */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-600" />
              Manejo básico
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">{medication.professionalManagement}</p>
          </div>

          {/* Perlas prácticas */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-green-600" />
              Perlas prácticas
            </h2>
            <ul className="text-sm text-gray-700 space-y-1">
              {medication.professionalPracticalTips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-600">💡</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Link a ficha técnica */}
          {medication.professionalDatasheetLink && (
            <div className="border-2 p-4 rounded-lg" style={{ borderColor: `${primaryColor}40` }}>
              <a
                href={medication.professionalDatasheetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-medium text-sm hover:underline"
                style={{ color: primaryColor }}
              >
                <ExternalLink className="w-4 h-4" />
                Ver ficha técnica oficial
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Footer personalizado */}
      {hospitalSettings?.customFooter && (
        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-gray-700 text-center">
            {hospitalSettings.customFooter}
          </p>
        </div>
      )}

      {/* Disclaimer legal */}
      <div className="mt-6 pt-4 border-t border-gray-300">
        <p className="text-xs text-gray-600 text-center">
          <strong>Información de consulta.</strong> No sustituye el juicio clínico profesional.
          Fuente: Ficha técnica oficial y guías clínicas. Verifique siempre las indicaciones individualizadas para cada paciente.
        </p>
      </div>
    </div>
  )
}
