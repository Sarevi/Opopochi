import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed de la base de datos...')

  // Crear usuario de prueba
  const hashedPassword = await hash('password123', 12)

  const user = await prisma.user.upsert({
    where: { email: 'test@pharmagraph.com' },
    update: {},
    create: {
      email: 'test@pharmagraph.com',
      name: 'Usuario de Prueba',
      password: hashedPassword,
      hasPaid: true,
      role: 'user',
    },
  })

  console.log('Usuario de prueba creado:', user.email)

  // Crear patologías
  const neurologia = await prisma.pathology.upsert({
    where: { slug: 'neurologia' },
    update: {},
    create: {
      name: 'Neurología',
      slug: 'neurologia',
      description: 'Medicamentos biológicos para enfermedades neurológicas',
      icon: 'brain',
    },
  })

  const neumologia = await prisma.pathology.upsert({
    where: { slug: 'neumologia' },
    update: {},
    create: {
      name: 'Neumología',
      slug: 'neumologia',
      description: 'Medicamentos biológicos para enfermedades respiratorias',
      icon: 'wind',
    },
  })

  const reumatologia = await prisma.pathology.upsert({
    where: { slug: 'reumatologia' },
    update: {},
    create: {
      name: 'Reumatología',
      slug: 'reumatologia',
      description: 'Medicamentos biológicos para enfermedades reumatológicas',
      icon: 'bone',
    },
  })

  console.log('Patologías creadas')

  // Crear medicamento de ejemplo - Adalimumab
  await prisma.medication.upsert({
    where: { slug: 'adalimumab' },
    update: {},
    create: {
      name: 'Adalimumab',
      slug: 'adalimumab',
      genericName: 'Anticuerpo monoclonal anti-TNF',
      pathologyId: reumatologia.id,

      // Información para pacientes
      patientDescription: 'Adalimumab es un medicamento biológico que ayuda a controlar enfermedades inflamatorias como la artritis reumatoide, la enfermedad de Crohn o la psoriasis. Actúa bloqueando una proteína llamada TNF-alfa que causa inflamación en tu cuerpo.',

      patientAdministration: 'Se administra mediante una inyección subcutánea (debajo de la piel), generalmente cada 2 semanas. Puedes aplicártela tú mismo en casa después de recibir formación. Las zonas más comunes son el abdomen o los muslos.',

      patientExpectations: 'Los beneficios suelen notarse entre 2 y 12 semanas después de iniciar el tratamiento. Notarás menos dolor, menos inflamación en las articulaciones y mayor movilidad. Es importante ser constante con el tratamiento.',

      patientSideEffects: [
        'Reacción en el lugar de inyección (enrojecimiento, picor)',
        'Dolor de cabeza leve',
        'Náuseas ocasionales',
        'Infecciones respiratorias leves (resfriados)',
      ],

      patientWarningsSigns: [
        'Fiebre alta (más de 38°C)',
        'Signos de infección grave (tos persistente, heridas que no cicatrizan)',
        'Dificultad para respirar',
        'Reacciones alérgicas graves (hinchazón, urticaria extensa)',
        'Dolor abdominal intenso',
      ],

      patientBeforeStart: [
        'Vacunarte según calendario (consulta con tu médico)',
        'Realizar análisis de tuberculosis y hepatitis',
        'Informar si has tenido infecciones recientes',
        'Avisar si estás embarazada o planeas estarlo',
      ],

      patientTips: [
        'Saca la inyección del frigorífico 30 minutos antes de aplicarla',
        'Rota las zonas de inyección para evitar molestias',
        'Lleva el medicamento en nevera portátil si viajas',
        'No te olvides de tus citas de seguimiento',
        'Evita el contacto con personas con infecciones activas',
      ],

      patientContactInfo: 'Servicio de Farmacia Hospitalaria: 900 XXX XXX',

      // Información para profesionales
      professionalIndication: 'Artritis reumatoide moderada a grave, artritis psoriásica, espondilitis anquilosante, enfermedad de Crohn, colitis ulcerosa, psoriasis en placas, hidradenitis supurativa, uveítis.',

      professionalDosage: 'Dosis habitual: 40 mg SC cada 2 semanas.\nEn AR puede aumentarse a semanal si respuesta insuficiente.\nEnfermedad de Crohn/CU: dosis de carga 160 mg → 80 mg → 40 mg c/2sem.',

      professionalPrerequisites: [
        'Screening TB (Mantoux/IGRA + Rx tórax)',
        'Serología hepatitis B y C',
        'VIH (si factores de riesgo)',
        'Vacunación al día (gripe, neumococo). No virus vivos.',
        'Descartar infección activa',
      ],

      professionalMonitoring: [
        'Hemograma y bioquímica cada 3-6 meses',
        'Vigilar signos de infección',
        'TB latente: profilaxis con isoniazida antes de iniciar',
        'Evaluar eficacia clínica según patología',
      ],

      professionalManagement: 'Retrasos: si <2 semanas, administrar dosis; si >2 semanas, contactar con prescriptor.\nInfecciones leves: valorar suspensión temporal.\nCirugía: suspender 2-4 semanas antes (según riesgo).\nEmbarazo: puede usarse si necesario, valorar riesgo/beneficio.',

      professionalPreparation: 'Conservación: 2-8°C. No congelar.\nEstable 14 días a temperatura ambiente (<25°C).\nJeringa precargada o pluma autoinyectable.\nNo requiere reconstitución.',

      professionalPracticalTips: [
        'Formar bien al paciente en autoadministración',
        'Revisar técnica de inyección en consultas',
        'Recordar vacunación antes de iniciar (virus vivos contraindicados)',
        'En AR, combinar con MTX mejora eficacia y reduce inmunogenicidad',
        'Si alergia al látex: usar presentación sin látex en capuchón',
      ],

      professionalDatasheetLink: 'https://cima.aemps.es/cima/dochtml/ft/04229002/FT_04229002.html',
    },
  })

  // Crear otro medicamento de ejemplo - Metotrexato
  await prisma.medication.upsert({
    where: { slug: 'metotrexato' },
    update: {},
    create: {
      name: 'Metotrexato',
      slug: 'metotrexato',
      genericName: 'Antimetabolito inmunosupresor',
      pathologyId: reumatologia.id,

      patientDescription: 'El metotrexato es un medicamento que se usa para tratar la artritis reumatoide y otras enfermedades inflamatorias. Actúa disminuyendo la actividad del sistema inmunitario para reducir la inflamación.',

      patientAdministration: 'Se toma una vez a la semana, el mismo día cada semana. Puede ser en comprimidos o inyección subcutánea. Es muy importante tomar ácido fólico los otros días de la semana para prevenir efectos secundarios.',

      patientExpectations: 'Los beneficios suelen aparecer entre 4 y 8 semanas. Notarás menos dolor e hinchazón en las articulaciones. Es un tratamiento de fondo que necesita constancia.',

      patientSideEffects: [
        'Náuseas o molestias estomacales',
        'Cansancio',
        'Úlceras en la boca',
        'Pérdida leve de cabello',
      ],

      patientWarningsSigns: [
        'Fiebre, escalofríos o signos de infección',
        'Tos seca persistente o dificultad para respirar',
        'Sangrado o moratones fáciles',
        'Vómitos persistentes',
        'Ictericia (piel u ojos amarillos)',
      ],

      patientBeforeStart: [
        'Realizar análisis de sangre y función hepática',
        'Descartar embarazo (método anticonceptivo obligatorio)',
        'Radiografía de tórax',
        'Evitar alcohol completamente',
      ],

      patientTips: [
        'Toma el metotrexato el mismo día cada semana',
        'No olvides el ácido fólico los otros 6 días',
        'Evita el alcohol por completo',
        'Usa métodos anticonceptivos eficaces',
        'Acude a tus análisis de control regularmente',
      ],

      patientContactInfo: 'Servicio de Farmacia Hospitalaria: 900 XXX XXX',

      professionalIndication: 'Artritis reumatoide, artritis psoriásica, artritis idiopática juvenil, psoriasis grave.',

      professionalDosage: 'AR: 7.5-25 mg VO o SC una vez por semana.\nInicio: 7.5-10 mg/semana, incrementos de 2.5-5 mg cada 2-4 semanas según respuesta.\nDosis máxima habitual: 25 mg/semana.',

      professionalPrerequisites: [
        'Hemograma, función renal y hepática',
        'Rx tórax (descartar patología pulmonar previa)',
        'Test de embarazo negativo',
        'VHB, VHC, VIH si factores de riesgo',
        'Anticoncepción eficaz en edad fértil',
      ],

      professionalMonitoring: [
        'Hemograma y función hepática cada 2-4 semanas los primeros 3 meses',
        'Después: cada 8-12 semanas',
        'Función renal periódica',
        'Vigilar signos de toxicidad pulmonar',
      ],

      professionalManagement: 'Olvido de dosis: si <3 días, tomar; si >3 días, omitir y continuar siguiente semana.\nCirugía: valorar suspensión 1-2 semanas antes.\nInfecciones: suspender temporalmente.\nEmbarazo: contraindicado, suspender 3 meses antes de concebir.',

      professionalPreparation: 'Comprimidos: conservación a temperatura ambiente.\nJeringas precargadas SC: refrigeración 2-8°C.\nÁcido fólico obligatorio: 5-10 mg/semana repartidos en 6 días.',

      professionalPracticalTips: [
        'Enfatizar: UNA VEZ POR SEMANA (errores frecuentes)',
        'Ácido fólico reduce toxicidad sin afectar eficacia',
        'Abstinencia absoluta de alcohol',
        'En monoterapia, menos eficaz que combinado con biológicos',
        'Si neutropenia: considerar rescate con leucovorina',
      ],

      professionalDatasheetLink: 'https://cima.aemps.es/cima/publico/home.html',
    },
  })

  console.log('Medicamentos de ejemplo creados')

  // Crear actualización de ejemplo
  const currentMonth = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const capitalizedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)

  await prisma.update.upsert({
    where: { id: 'update-ejemplo' },
    update: {},
    create: {
      id: 'update-ejemplo',
      title: `Actualización de ${capitalizedMonth}`,
      month: capitalizedMonth,
      publishDate: new Date(),
      isPublished: true,
      featured: true,

      ftChanges: [
        'Adalimumab: Nueva advertencia sobre riesgo cardiovascular en pacientes >65 años con factores de riesgo',
        'Metotrexato: Actualización en dosis máxima semanal recomendada en artritis psoriásica (25mg)',
        'Infliximab: Cambios en el protocolo de premedicación para reducir reacciones infusionales',
      ],

      newMedications: [
        'Risankizumab (Skyrizi) - Aprobado para enfermedad de Crohn moderada-grave. Dosis: 600mg IV inducción (semanas 0, 4, 8) y luego 360mg SC cada 8 semanas',
        'Upadacitinib (Rinvoq) - Extensión de indicación a espondilitis anquilosante. Dosis: 15mg/día VO',
      ],

      screeningReminders: [
        '🔴 Temporada de gripe: Recordar vacunación antes de iniciar biológicos (mínimo 2 semanas antes)',
        '🔍 Screening TB: Obligatorio antes de anti-TNF. Considerar Quantiferon en pacientes vacunados con BCG',
        '💉 Vacuna neumococo: Esquema completo (conjugada + polisacárida) en todos los pacientes con biológicos',
        '🧪 Hepatitis B: Screening previo obligatorio. Riesgo de reactivación con rituximab y anti-TNF',
      ],

      clinicalTips: [
        'Viajes al extranjero: Suspender biológicos 1-2 semanas antes si viaje a zona endémica de infecciones. Retomar solo si asintomático 2 semanas post-regreso',
        'Cirugía programada: Anti-TNF suspender 2-4 semanas antes según semivida. Reiniciar cuando herida cicatrizada (aprox 2 semanas)',
        'Embarazo: Adalimumab y certolizumab son los anti-TNF más seguros (no atraviesan placenta en 3er trimestre). Evitar vacunas vivas en bebé hasta 6 meses si exposición en 3er trimestre',
        'Infecciones leves (resfriado): No suspender si afebril y sin síntomas sistémicos. Valorar individualmente',
      ],
    },
  })

  console.log('Actualización de ejemplo creada')

  // Crear disclaimer
  await prisma.disclaimer.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      content: 'La información contenida en estas infografías tiene carácter orientativo y está basada en las fichas técnicas oficiales de los medicamentos y guías clínicas actualizadas. Esta información no sustituye en ningún caso el juicio clínico profesional ni la evaluación individualizada de cada paciente. Siempre se debe consultar con profesionales sanitarios cualificados para el diagnóstico, tratamiento y seguimiento de cualquier condición médica.',
    },
  })

  console.log('Disclaimer creado')
  console.log('Seed completado exitosamente!')
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
