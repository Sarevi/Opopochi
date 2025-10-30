"use client"

import {
  Pill,
  Activity,
  AlertTriangle,
  Clock,
  Beaker,
  ExternalLink,
  Lightbulb
} from "lucide-react"

interface HospitalSettings {
  hospitalName?: string
  departmentName?: string
  logoUrl?: string | null
  contactPhone?: string
  contactEmail?: string
  customFooter?: string
  primaryColor?: string
}

interface QuickReferenceViewProps {
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
  hospitalSettings?: HospitalSettings | null
}

export default function QuickReferenceView({ medication, hospitalSettings }: QuickReferenceViewProps) {
  const primaryColor = hospitalSettings?.primaryColor || "#2563eb"

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-5xl mx-auto">
      {/* Header Compacto */}
      <div className="border-b-2 border-gray-200 pb-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{medication.name}</h1>
            {medication.genericName && (
              <p className="text-lg text-gray-600">({medication.genericName})</p>
            )}
          </div>
          <div className="text-right text-xs text-gray-500">
            Actualizado: {new Date(medication.lastUpdated).toLocaleDateString('es-ES')}
          </div>
        </div>
      </div>

      {/* Grid de 2 columnas para información clave */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Indicación */}
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
            <div className="p-2 rounded-full bg-blue-100">
              <Pill className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">Indicación</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {medication.professionalIndication}
              </p>
            </div>
          </div>

          {/* Posología destacada */}
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
            <div className="p-2 rounded-full bg-green-100">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">Posología</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {medication.professionalDosage}
              </p>
            </div>
          </div>

          {/* Preparación */}
          <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
            <div className="p-2 rounded-full bg-purple-100">
              <Beaker className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">Preparación</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {medication.professionalPreparation}
              </p>
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="space-y-4">
          {/* Requisitos previos - Compacto */}
          <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h3 className="font-bold text-gray-900">Antes de iniciar</h3>
            </div>
            <ul className="space-y-1">
              {medication.professionalPrerequisites.map((req, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">→</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Monitorización - Compacto */}
          <div className="p-4 rounded-lg border-l-4" style={{ backgroundColor: `${primaryColor}10`, borderColor: primaryColor }}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5" style={{ color: primaryColor }} />
              <h3 className="font-bold text-gray-900">Monitorización</h3>
            </div>
            <ul className="space-y-1">
              {medication.professionalMonitoring.map((item, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span style={{ color: primaryColor }}>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Perlas prácticas destacadas */}
          <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-gray-900">💡 Tips Clave</h3>
            </div>
            <ul className="space-y-1">
              {medication.professionalPracticalTips.slice(0, 3).map((tip, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-green-600">→</span>
                  <span className="font-medium">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Manejo básico - Fila completa */}
      <div className="p-4 bg-gray-50 rounded-lg border-t-4 border-gray-400 mb-6">
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-600" />
          Manejo de Situaciones Especiales
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {medication.professionalManagement}
        </p>
      </div>

      {/* Footer con acciones rápidas */}
      <div className="flex items-center justify-between pt-4 border-t">
        {medication.professionalDatasheetLink && (
          <a
            href={medication.professionalDatasheetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium hover:underline"
            style={{ color: primaryColor }}
          >
            <ExternalLink className="w-4 h-4" />
            Ver ficha técnica completa
          </a>
        )}
        <div className="text-xs text-gray-500">
          Modo Consulta Rápida - Para información completa, ver ficha profesional
        </div>
      </div>
    </div>
  )
}
