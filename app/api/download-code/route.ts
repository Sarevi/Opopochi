import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"

// POST - Generar código de descarga único
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { medicationId, medicationName, patientName, infographicType } = await req.json()

    // Validar datos requeridos
    if (!medicationId || !medicationName || !infographicType) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      )
    }

    if (!["patient", "professional"].includes(infographicType)) {
      return NextResponse.json(
        { error: "Tipo de infografía inválido" },
        { status: 400 }
      )
    }

    // Generar código único
    const downloadCode = nanoid(12).toUpperCase()

    // Crear registro de descarga
    const download = await prisma.infographicDownload.create({
      data: {
        downloadCode,
        userId,
        medicationId,
        medicationName,
        patientName: patientName || null,
        infographicType,
      },
    })

    return NextResponse.json({
      downloadCode: download.downloadCode,
      generatedAt: download.generatedAt,
    })
  } catch (error) {
    console.error("Error al generar código:", error)
    return NextResponse.json(
      { error: "Error al generar el código de descarga" },
      { status: 500 }
    )
  }
}

// GET - Verificar código de descarga
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")

    if (!code) {
      return NextResponse.json(
        { error: "Código no proporcionado" },
        { status: 400 }
      )
    }

    const download = await prisma.infographicDownload.findUnique({
      where: { downloadCode: code },
      include: {
        user: {
          include: {
            hospitalSettings: true,
          },
        },
      },
    })

    if (!download) {
      return NextResponse.json(
        { error: "Código no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      medicationName: download.medicationName,
      patientName: download.patientName,
      infographicType: download.infographicType,
      generatedAt: download.generatedAt,
      hospitalSettings: download.user.hospitalSettings,
    })
  } catch (error) {
    console.error("Error al verificar código:", error)
    return NextResponse.json(
      { error: "Error al verificar el código" },
      { status: 500 }
    )
  }
}
