"use client"

import { useEffect, useRef } from "react"
import QRCode from "qrcode"

interface QRCodeDisplayProps {
  code: string
  size?: number
}

export default function QRCodeDisplay({ code, size = 120 }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current && code) {
      // URL que apunta a la verificación del código
      const url = `${window.location.origin}/verify/${code}`

      QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 1,
        color: {
          dark: "#1e40af", // blue-800
          light: "#ffffff",
        },
      })
    }
  }, [code, size])

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} className="border-2 border-gray-200 rounded-lg" />
      <span className="text-xs font-mono text-gray-600">{code}</span>
    </div>
  )
}
