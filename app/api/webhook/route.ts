import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  // Verificar header internalKey
  const internalKey = req.headers.get('internalKey');
  if (!internalKey || internalKey !== process.env.INTERNAL_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid internal key' }, 
      { status: 401 }
    );
  }

  const data = await req.json();

  let message: string = 'Aguardando conexão ...';
  let connected = false;

  if (data.event === 'connection.update' && data.data === 'sucesso') {
    connected = true;
    message = 'Conectado com sucesso';
  } else if (data.event === 'error.authorized') {
    connected = false;
    message = 'Erro de autorização';
  }

  const { error } = await supabase
    .from('connection_state')
    .upsert({ key: data.key, connected, message });

  if (error) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok' });
}

// ================== DELETE ==================
export async function DELETE(req: Request) {
  try {
    const { key } = await req.json();

    if (!key) {
      return NextResponse.json(
        { message: 'Key obrigatória para deletar conexão' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('connection_state')
      .delete()
      .eq('key', key);

    if (error) {
      return NextResponse.json({ message: 'Erro ao deletar conexão' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Conexão deletada com sucesso' });
  } catch  {
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}