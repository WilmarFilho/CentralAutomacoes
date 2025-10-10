'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import style from './page.module.css'
import { toast } from 'react-hot-toast'

export default function HomePage() {
  const [number, setNumber] = useState('')
  const [key, setKey] = useState('')
  const [evolutionKey, setEvolutionKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [showQrSection, setShowQrSection] = useState(false)
  const [connected, setConnected] = useState(false)

  // Componente Spinner
  const Spinner = () => (
    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
  )

  useEffect(() => {
    if (!evolutionKey) return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/events?key=${evolutionKey}`);
      const data = await res.json();

      if (!data) return;

      if (data.connected) {
        setConnected(true);
        setQrCode(null);
        setShowQrSection(false);
        toast.success('Conectado com sucesso!');

        clearInterval(interval);
      }
    }, 3000);

    // Limpeza ao desmontar o componente
    return () => clearInterval(interval);
  }, [evolutionKey]);


  const handleConnect = async () => {

    if (!key || key.length <= 10) return

    setLoading(true)

    try {

      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, number: number || undefined }),
      })

      const data = await res.json()

      // Verifica se é uma resposta de erro
      if (data.errorMessage) {
        toast.error(data.errorMessage)
        return
      }

      // Resposta de sucesso
      if (data.message) {
        toast.success(data.message)
      }

      if (data.qrcode) {
        setEvolutionKey(data.evolutionKey)
        setQrCode(data.qrcode)
        setShowQrSection(true)
      }

      if (data.pairingCode) {
        setPairingCode(data.pairingCode)
      }

    } catch (e: unknown) {
      setQrCode(null)
      setPairingCode(null)
      setShowQrSection(false)
      if (e && typeof e === 'object' && 'message' in e) {
        toast.error('Erro na conexão: ' + (e as { message: string }).message)
      } else {
        toast.error('Erro na conexão.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && key.length > 10) {
      handleConnect()
    }
  }

  return (
    <main
      className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: "url('/bg.png')",
        padding: '0 20px',
      }}
    >

      {/* Conteúdo da página */}
      <div className={style.container}>

        <div className={style.header}>
          <div>
            <Image
              src="/logo.png"
              alt="Logo Central Automações"
              width={200}
              height={100}
              className="mx-auto"
            />
          </div>
          <div className={style.title}>
            <p className="text-white drop-shadow-lg">
              Insira sua key de agente (mín. 10 caracteres). O número é opcional e permite conexão via código no WhatsApp.
            </p>
          </div>
        </div>

        {/* Botão de status conectado */}
        {connected && (
          <div className="mt-4 px-6 py-3 bg-green-500 text-white rounded-lg shadow-lg">
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <span className="font-medium">WhatsApp Conectado com Sucesso!</span>
            </div>
          </div>
        )}

        {/* Inputs lado a lado com labels - ocultos quando QR está visível ou conectado */}
        {!showQrSection && !connected && (
          <div className={style.inputGroup}>
          <div className={style.inputColumn}>
            <div className={style.labelWithImage}>
              <Image
                src="/key.svg"
                alt="Logo Central Automações"
                width={100}
                height={50}
                className={style.iconLabel}
              />
              <label className="text-white text-sm drop-shadow-lg">Key do Agente:</label>
            </div>

            <input
              type="text"
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua key..."
              className={style.input}
            />
          </div>

          <div className={style.inputColumn}>
            <div className={style.labelWithImage}>
              <Image
                src="/logo.svg"
                alt="Logo Central Automações"
                width={100}
                height={50}
                className={style.iconLabel}
              />
              <label className="text-white text-sm drop-shadow-lg">Número WhatsApp (Opcional):</label>
            </div>

            <input
              type="text"
              value={number}
              onChange={e => setNumber(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="64999887766 ( Área + Número )"
              className={style.input}
            />
            <p className="text-white text-xs mt-1 drop-shadow-lg">
              Formato: código da área + número.
            </p>
          </div>
        </div>
        )}

        {showQrSection && qrCode && (
          <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
            <p className="text-gray-700 text-sm mb-2 text-center">
              Escaneie o QR Code com o WhatsApp:
            </p>
            <Image
              src={qrCode}
              alt="QR Code WhatsApp"
              width={200}
              height={200}
              className="mx-auto border rounded"
            />
            {pairingCode && (
              <div className="mt-3 p-3 bg-gray-50 rounded">
                <p className="text-gray-700 text-sm text-center font-medium mb-1">
                  Código de Pareamento:
                </p>
                <p className="text-center text-lg font-mono font-bold text-blue-600">
                  {pairingCode}
                </p>
                <p className="text-gray-600 text-xs mt-1 text-center">
                  Digite este código no WhatsApp
                </p>
              </div>
            )}
          </div>
        )}

        {!showQrSection && !connected && (
          <button
            onClick={handleConnect}
            disabled={!key || key.length <= 10 || loading}
            className={`${key.length > 10 && !loading ? style.submitActive : style.submit}`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner />
                <span>Conectando...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>Conectar</span>
                <Image src="/arrow.webp" className={style.iconSubmit} alt="Seta" width={16} height={16} />
              </div>
            )}
          </button>
        )}
      </div>
    </main>
  )
}