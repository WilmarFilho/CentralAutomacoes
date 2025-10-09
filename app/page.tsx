'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function HomePage( ) {
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [qrCode, setQrCode] = useState('')

  const handleConnect = async () => {
    if (!key) return
    setLoading(true)
    setMessage('')
    setQrCode('')

    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      const data = await res.json()
      setMessage(data.message)
      
      if (data.qrcode) {
        setQrCode(data.qrcode)
      }
    } catch(e: unknown) {
      if (e && typeof e === 'object' && 'message' in e) {
        setMessage('Erro na conexão: ' + (e as { message: string }).message)
      } else {
        setMessage('Erro na conexão.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect()
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Central de Conexão WhatsApp
      </h1>

      <p className="text-gray-600 mb-6">
        Insira sua key de agente para conectar ao Evolution.
      </p>

      <input
        type="text"
        value={key}
        onChange={e => setKey(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Digite sua key..."
        className="border rounded-lg p-2 w-64 text-center outline-none focus:ring-2 focus:ring-blue-500 text-black"
      />

      {!qrCode &&message && (
        <p className="mt-4 text-gray-700 text-sm bg-white shadow-sm px-3 py-2 rounded">
          {message}
        </p>
      )}

      {qrCode && (
        <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
          <p className="text-gray-700 text-sm mb-2 text-center">Escaneie o QR Code com o WhatsApp:</p>
          <Image 
            src={qrCode} 
            alt="QR Code WhatsApp" 
            width={200}
            height={200}
            className="mx-auto border rounded"
          />
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={!key || loading}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-300 w-80 cursor-pointer"
      >
        {loading ? 'Conectando...' : 'Conectar'}
      </button>

      
    </main>
  )
}




