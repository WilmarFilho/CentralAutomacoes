import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const data = await req.json()
    console.log('Evento recebido do n8n:', data)

    // Aqui você pode processar o evento se quiser (exibir logs, respostas, etc.)
    if (data.type === 'message') {
      console.log('Mensagem:', data.content)
    }

    // Retorna sucesso pro n8n
    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('Erro no webhook:', err)
    return NextResponse.json({ status: 'erro' }, { status: 500 })
  }
}
