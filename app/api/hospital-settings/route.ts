import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Obtener configuración del hospital
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id

    // Obtener o crear configuración del hospital
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { hospitalSettings: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Si no tiene configuración, devolver valores por defecto
    if (!user.hospitalSettings) {
      return NextResponse.json({
        hospitalName: "",
        departmentName: "Servicio de Farmacia Hospitalaria",
        logoUrl: null,
        contactPhone: "",
        contactEmail: user.email,
        address: "",
        customFooter: null,
        primaryColor: "#2563eb",
      })
    }

    return NextResponse.json(user.hospitalSettings)
  } catch (error) {
    console.error("Error al obtener configuración:", error)
    return NextResponse.json(
      { error: "Error al obtener la configuración" },
      { status: 500 }
    )
  }
}

// POST - Actualizar configuración del hospital
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
    const data = await req.json()

    // Validar datos requeridos
    if (!data.hospitalName) {
      return NextResponse.json(
        { error: "El nombre del hospital es requerido" },
        { status: 400 }
      )
    }

    // Obtener el usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { hospitalSettings: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    let hospitalSettings

    if (user.hospitalSettings) {
      // Actualizar configuración existente
      hospitalSettings = await prisma.hospitalSettings.update({
        where: { id: user.hospitalSettings.id },
        data: {
          hospitalName: data.hospitalName,
          departmentName: data.departmentName,
          logoUrl: data.logoUrl,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail,
          address: data.address,
          customFooter: data.customFooter,
          primaryColor: data.primaryColor || "#2563eb",
        },
      })
    } else {
      // Crear nueva configuración
      hospitalSettings = await prisma.hospitalSettings.create({
        data: {
          hospitalName: data.hospitalName,
          departmentName: data.departmentName || "Servicio de Farmacia Hospitalaria",
          logoUrl: data.logoUrl,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail || user.email,
          address: data.address,
          customFooter: data.customFooter,
          primaryColor: data.primaryColor || "#2563eb",
        },
      })

      // Vincular configuración al usuario
      await prisma.user.update({
        where: { id: userId },
        data: { hospitalSettingsId: hospitalSettings.id },
      })
    }

    return NextResponse.json(hospitalSettings)
  } catch (error) {
    console.error("Error al guardar configuración:", error)
    return NextResponse.json(
      { error: "Error al guardar la configuración" },
      { status: 500 }
    )
  }
}
