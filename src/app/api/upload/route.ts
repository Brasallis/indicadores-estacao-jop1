import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Salvar em public/uploads
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    // Garantir que o diretório exista
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      console.error('Erro ao criar diretório uploads:', e);
    }

    // Criar um nome de arquivo único
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + '-' + file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filepath = join(uploadDir, filename);

    await writeFile(filepath, buffer);

    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error('Erro no upload de imagem:', error);
    return NextResponse.json({ success: false, error: 'Erro ao salvar arquivo.' }, { status: 500 });
  }
}
