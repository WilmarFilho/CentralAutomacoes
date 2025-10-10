import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';



const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'Key obrigatória' }, { status: 400 });

  const { data, error } = await supabase
    .from('connection_state')
    .select('*')
    .eq('key', key)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json(data?.[0] || null);
}
