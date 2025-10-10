import { NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import { agents } from '@/lib/agents';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { key, number } = await req.json();

    if (!key)
      return NextResponse.json({ errorMessage: 'Key obrigatória' }, { status: 400 });

    const agent = agents.find(a => a.key === key);
    if (!agent)
      return NextResponse.json({ errorMessage: 'Key inválida, consulte nosso suporte' }, { status: 401 });


    // Verificar se a instância já existe na Evolution API
    try {
      const instanceResponse = await axios.get(
        `${process.env.CREATE_CONNECTION_ENDPOINT}instance/fetchInstances?instanceName=${agent.key}`,
        { headers: { apikey: process.env.EVOLUTION_API_KEY } }
      );

      // Verifica se a resposta contém dados da instância
      if (instanceResponse.data) {
        const connectionStatus = instanceResponse.data.connectionStatus;

        if (connectionStatus === 'open') {
          return NextResponse.json({ 
            message: 'Instância já está conectada e ativa na Evolution API.' 
          }, { status: 200 });
        } else {
          // Instância existe mas não está aberta, tenta deletar
          try {
            await axios.delete(
              `${process.env.CREATE_CONNECTION_ENDPOINT}instance/delete/${agent.key}`,
              { headers: { apikey: process.env.EVOLUTION_API_KEY } }
            );
          } catch {
            // Continua o fluxo mesmo se não conseguir deletar
          }
        }
      }
    } catch {
     
    }

    // Verificar no Supabase se já existe um registro com essa key
    const { data: existingRecord } = await supabase
      .from('connection_state')
      .select('*')
      .eq('key', key)
      .single();

    if (existingRecord) {
      if (existingRecord.connected) {
        return NextResponse.json({
          message: 'Esta key já está conectada e ativa.'
        }, { status: 200 });
      } else {
        // Se existe mas não está conectado, apaga o registro
        const { error: deleteError } = await supabase
          .from('connection_state')
          .delete()
          .eq('key', key);

        if (deleteError) {
          return NextResponse.json({
            errorMessage: 'Erro interno do servidor'
          }, { status: 500 });
        }
      }
    }

    // Validação e formatação do número
    let formattedNumber = '';
    let evolutionUrl = `${process.env.CREATE_CONNECTION_ENDPOINT}instance/create`;

    if (number && number.trim() !== '') {
      // Valida formato do número (deve ser exatamente 11 dígitos: 64992434104)
      const numberRegex = /^\d{11}$/;
      if (!numberRegex.test(number.trim())) {
        return NextResponse.json({
          errorMessage: 'Número inválido. Use o formato: 64992434104 (área + número sem espaços ou caracteres especiais)'
        }, { status: 400 });
      }

      // Adiciona o prefixo 55 (Brasil)
      formattedNumber = `55${number.trim()}`;
      evolutionUrl += `?number=${formattedNumber}`;
    }

    // Chama a API do Evolution
    const response = await axios.post(
      evolutionUrl,
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
    const pairingCode = response.data?.qrcode?.pairingCode;
    const evolutionKey = response.data?.instance.instanceName;

    if (!qrcode) {
      return NextResponse.json(
        { errorMessage: 'A API não retornou o QR Code esperado.' },
        { status: 502 }
      );
    }

    // Monta a resposta baseada no que foi enviado
    const responseData: { message: string; qrcode: string; pairingCode?: string; evolutionKey?: string } = {
      message: 'Instância criada com sucesso, agora escaneie o QR Code!',
      qrcode,
      evolutionKey
    };

    // Se foi enviado número e existe pairingCode, inclui na resposta
    if (formattedNumber && pairingCode) {
      responseData.pairingCode = pairingCode;
      responseData.message = `Instância criada para o número ${formattedNumber}. Use o código de pareamento ou escaneie o QR Code.`;
    }

    return NextResponse.json(responseData);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      type ErrorResponse = { message?: string };
      const error = err as AxiosError<ErrorResponse>;
      const status = error.response?.status || 500;
      const message =
        error.response?.data?.message ||
        error.message ||
        'Erro ao comunicar com a API Evolution';

      return NextResponse.json(
        { message: `Erro Evolution: ${message}` },
        { status }
      );
    }

    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}