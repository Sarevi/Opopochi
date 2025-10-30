import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Obtener actualizaciones publicadas
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const featured = searchParams.get("featured")

    const updates = await prisma.update.findMany({
      where: {
        isPublished: true,
        ...(featured === "true" && { featured: true }),
      },
      orderBy: {
        publishDate: "desc",
      },
      take: featured === "true" ? 1 : 10,
    })

    return NextResponse.json(updates)
  } catch (error) {
    console.error("Error al obtener actualizaciones:", error)
    return NextResponse.json(
      { error: "Error al obtener actualizaciones" },
      { status: 500 }
    )
  }
}

// POST - Crear una nueva actualización (solo admin)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      )
    }

    const data = await req.json()

    const update = await prisma.update.create({
      data: {
        title: data.title,
        month: data.month,
        publishDate: data.publishDate ? new Date(data.publishDate) : new Date(),
        ftChanges: data.ftChanges || [],
        newMedications: data.newMedications || [],
        screeningReminders: data.screeningReminders || [],
        clinicalTips: data.clinicalTips || [],
        isPublished: data.isPublished || false,
        featured: data.featured || false,
      },
    })

    return NextResponse.json(update, { status: 201 })
  } catch (error) {
    console.error("Error al crear actualización:", error)
    return NextResponse.json(
      { error: "Error al crear actualización" },
      { status: 500 }
    )
  }
}
