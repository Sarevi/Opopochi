import { NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get("Stripe-Signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error("Error al verificar el webhook:", error)
    return NextResponse.json(
      { error: "Error en el webhook" },
      { status: 400 }
    )
  }

  // Manejar el evento
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    // Actualizar el usuario como pagado
    await prisma.user.update({
      where: {
        id: session.metadata?.userId,
      },
      data: {
        hasPaid: true,
        paymentDate: new Date(),
        stripeCustomerId: session.customer as string,
      },
    })
  }

  return NextResponse.json({ received: true })
}
