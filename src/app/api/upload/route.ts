import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

// Use os.tmpdir() for cross-platform temp directory
const UPLOAD_DIR = process.platform === 'win32'
  ? join(process.env.TEMP || 'C:\\Windows\\Temp', 'opie-uploads')
  : '/tmp/opie-uploads';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate it's an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'png';
    const filename = `upload-${timestamp}.${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Convert to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    console.log('[Upload] Saved image:', filepath);

    return NextResponse.json({
      success: true,
      path: filepath,
      filename,
      size: buffer.length,
      type: file.type,
    });

  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json(
      { error: 'Upload failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
