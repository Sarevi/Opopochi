import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    if (!(session.user as any).hasPaid) {
      return NextResponse.json(
        { error: "Pago requerido" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q")

    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    // Búsqueda en nombre y nombre genérico
    const medications = await prisma.medication.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            genericName: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      include: {
        pathology: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      take: 10,
    })

    return NextResponse.json(medications)
  } catch (error) {
    console.error("Error en búsqueda:", error)
    return NextResponse.json(
      { error: "Error en la búsqueda" },
      { status: 500 }
    )
  }
}
