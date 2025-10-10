'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function HomePage() {
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!key) return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/events?key=${key}`);
      const data = await res.json();

      console.log('Polling data:', data);

      if (!data) return;

      if (data.connected) {
        setConnected(true);
        setQrCode(null);
        setMessage(data.message);

        // Para o polling quando conectado
        clearInterval(interval);
      } else {
        setConnected(false);
        setQrCode(null);
        setMessage(data.message);
      }
    }, 5000);

    // Limpeza ao desmontar o componente
    return () => clearInterval(interval);
  }, [key]);


  const handleConnect = async () => {
    if (!key) return
    setLoading(true)
    setMessage('')
    setConnected(false)

    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      const data = await res.json()
      setMessage(data.message || '')

      if (data.qrcode) {
        // Usa a resposta direta no src
        setQrCode(data.qrcode)
      }
    } catch (e: unknown) {
      setQrCode(null)
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
    if (e.key === 'Enter') handleConnect()
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

      {message && (
        <p className="mt-4 text-gray-700 text-sm bg-white shadow-sm px-3 py-2 rounded">
          {message}
        </p>
      )}

      {!connected && qrCode && (
        <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
          <p className="text-gray-700 text-sm mb-2 text-center">
            Escaneie o QR Code com o WhatsApp:
          </p>
          <Image
            src={qrCode} // direto do backend, já em Base64
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