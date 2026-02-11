import { NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import { agents } from '@/lib/agents';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Criamos uma instância do Axios com Timeout definido. 
// Isso evita que o processo do Node fique "pendurado" se a Evolution API travar.
const evolutionApi = axios.create({
  baseURL: process.env.CREATE_CONNECTION_ENDPOINT,
  timeout: 15000, // Máximo de 15 segundos de espera
  headers: { apikey: process.env.EVOLUTION_API_KEY }
});

export async function POST(req: Request) {
  try {
    const { key, number } = await req.json();

    if (!key) {
      return NextResponse.json({ errorMessage: 'Key obrigatória' }, { status: 400 });
    }

    const agent = agents.find(a => a.key === key);
    if (!agent) {
      return NextResponse.json({ errorMessage: 'Key inválida, consulte nosso suporte' }, { status: 401 });
    }

    // --- 1. VERIFICAÇÃO DE INSTÂNCIA EXISTENTE ---
    try {
      const instanceResponse = await evolutionApi.get(`instance/fetchInstances?instanceName=${agent.key}`);
      
      // Se a resposta for um array e tiver dados (dependendo da versão da Evolution)
      const instanceData = Array.isArray(instanceResponse.data) ? instanceResponse.data[0] : instanceResponse.data;

      if (instanceData && instanceData.instance) {
        const connectionStatus = instanceData.instance.status || instanceData.instance.state;

        if (connectionStatus === 'open') {
          return NextResponse.json({ 
            message: 'Instância já está conectada e ativa.' 
          }, { status: 200 });
        } else {
          // Tenta deletar a instância "suja" para criar uma nova limpa
          await evolutionApi.delete(`instance/delete/${agent.key}`).catch(() => {
             console.log("Falha ao deletar instância anterior, prosseguindo...");
          });
        }
      }
    } catch (e) {
      // Se der erro no fetch (ex: 404), apenas ignoramos e seguimos para criar
      console.log("Instância não encontrada ou erro no fetch, criando nova...");
    }

    // --- 2. VERIFICAÇÃO NO SUPABASE ---
    const { data: existingRecord } = await supabase
      .from('connection_state')
      .select('*')
      .eq('key', key)
      .single();

    if (existingRecord) {
      if (existingRecord.connected) {
        return NextResponse.json({ message: 'Esta key já está conectada e ativa.' }, { status: 200 });
      } else {
        await supabase.from('connection_state').delete().eq('key', key);
      }
    }

    // --- 3. FORMATAÇÃO E CRIAÇÃO ---
    let formattedNumber = '';
    let createPath = `instance/create`;

    if (number && number.trim() !== '') {
      const numberRegex = /^\d{11}$/;
      if (!numberRegex.test(number.trim())) {
        return NextResponse.json({
          errorMessage: 'Número inválido. Use o formato: 64992434104'
        }, { status: 400 });
      }
      formattedNumber = `55${number.trim()}`;
    }

    // Chama a API do Evolution para criar a instância
    const response = await evolutionApi.post(createPath, {
      instanceName: agent.key,
      number: formattedNumber || undefined, // Envia o número aqui se houver
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
    });

    const qrcode = response.data?.qrcode?.base64 || response.data?.base64;
    const pairingCode = response.data?.pairingCode || response.data?.qrcode?.pairingCode;
    const evolutionKey = response.data?.instance?.instanceName || agent.key;

    if (!qrcode && !pairingCode) {
      return NextResponse.json(
        { errorMessage: 'A API não retornou o método de conexão esperado.' },
        { status: 502 }
      );
    }

    // Resposta de sucesso ajustada
    const responseData: any = {
      message: 'Instância criada! Escaneie o QR Code ou use o código.',
      qrcode,
      evolutionKey
    };

    if (pairingCode) responseData.pairingCode = pairingCode;

    return NextResponse.json(responseData);

  } catch (err) {
    // Tratamento de erro centralizado para evitar loops de CPU
    if (axios.isAxiosError(err)) {
      const status = err.response?.status || 500;
      const message = err.code === 'ECONNABORTED' 
        ? 'A API Evolution demorou demais para responder. Tente novamente.' 
        : (err.response?.data as any)?.message || err.message;

      return NextResponse.json({ errorMessage: `Erro: ${message}` }, { status });
    }

    console.error("Erro Interno Critico:", err);
    return NextResponse.json({ errorMessage: 'Erro interno do servidor' }, { status: 500 });
  }
}
