import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/upload
 *
 * Public file upload endpoint for logos/photos.
 * Accepts multipart form data with a single "file" field and a "path" field.
 * Returns the public URL of the uploaded file.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const folder = (formData.get('folder') as string) || 'misc';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
  }

  // Limit file size to 5MB
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const ext = file.name.split('.').pop() || 'png';
  const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${folder}/${uniqueName}`;

  const buffer = await file.arrayBuffer();
  const { error } = await supabase.storage.from('logos').upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error('[upload] storage error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
