import { NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import { agents } from '@/lib/agents';

export async function POST(req: Request) {
  try {
    const { key } = await req.json();

    if (!key)
      return NextResponse.json({ message: 'Key obrigatória' }, { status: 400 });

    const agent = agents.find(a => a.key === key);
    if (!agent)
      return NextResponse.json({ message: 'Key inválida' }, { status: 401 });

    // Chama a API do Evolution
    const response = await axios.post(
      `${process.env.CREATE_CONNECTION_ENDPOINT}instance/create`,
      {
        instanceName: agent.key,
        qrcode: true,
        groupsIgnore: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: {
          url: agent.webhook,
          events: [
            'CONNECTION_UPDATE',
            'MESSAGES_UPSERT',
            'SEND_MESSAGE',
            'CHATS_UPSERT',
            'MESSAGES_DELETE',
          ],
        },
      },
      { headers: { apikey: process.env.EVOLUTION_API_KEY } }
    );

    const qrcode = response.data?.qrcode?.base64;

    if (!qrcode) {
      console.warn('Resposta inesperada da Evolution API:', response.data);
      return NextResponse.json(
        { message: 'A API não retornou o QR Code esperado.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: 'Conectado com sucesso!', qrcode });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      type ErrorResponse = { message?: string };
      const error = err as AxiosError<ErrorResponse>;
      const status = error.response?.status || 500;
      const message =
        error.response?.data?.message ||
        error.message ||
        'Erro ao comunicar com a API Evolution';

      console.error('Erro na API Evolution:', message, error.response?.data);

      return NextResponse.json(
        { message: `Erro Evolution: ${message}` },
        { status }
      );
    }

    console.error('Erro interno inesperado:', err);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}