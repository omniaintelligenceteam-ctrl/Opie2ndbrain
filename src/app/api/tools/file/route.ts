import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Security check for file paths
function validatePath(filePath: string): { isValid: boolean; error?: string } {
  if (filePath.includes('..') || filePath.startsWith('/') || filePath.includes('\\')) {
    return { isValid: false, error: 'Invalid path - must be relative to workspace without traversal' };
  }
  return { isValid: true };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, path: filePath, content, operation, search, replace, line_number, start_line, end_line } = body;

    if (!action || !filePath) {
      return NextResponse.json({ error: 'Missing required fields: action, path' }, { status: 400 });
    }

    // Validate path
    const pathValidation = validatePath(filePath);
    if (!pathValidation.isValid) {
      return NextResponse.json({ error: pathValidation.error }, { status: 400 });
    }

    const fullPath = path.join('/root/.openclaw/workspace', filePath);

    switch (action) {
      case 'write':
        if (!content) {
          return NextResponse.json({ error: 'Content is required for write action' }, { status: 400 });
        }

        // Create directory if it doesn't exist
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });

        await fs.writeFile(fullPath, content, 'utf-8');
        return NextResponse.json({ 
          success: true, 
          path: filePath, 
          size: content.length,
          action: 'write'
        });

      case 'edit':
        if (!operation) {
          return NextResponse.json({ error: 'Operation is required for edit action' }, { status: 400 });
        }

        // Read current file
        let currentContent;
        try {
          currentContent = await fs.readFile(fullPath, 'utf-8');
        } catch (error) {
          return NextResponse.json({ 
            error: `Failed to read file: ${error instanceof Error ? error.message : 'File not found'}` 
          }, { status: 404 });
        }

        let newContent;
        const lines = currentContent.split('\n');

        switch (operation) {
          case 'replace':
            if (!search || replace === undefined) {
              return NextResponse.json({ error: 'Replace operation requires search and replace parameters' }, { status: 400 });
            }
            newContent = currentContent.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
            break;

          case 'insert':
            if (line_number === undefined || content === undefined) {
              return NextResponse.json({ error: 'Insert operation requires line_number and content parameters' }, { status: 400 });
            }
            lines.splice(line_number - 1, 0, content);
            newContent = lines.join('\n');
            break;

          case 'append':
            if (content === undefined) {
              return NextResponse.json({ error: 'Append operation requires content parameter' }, { status: 400 });
            }
            newContent = currentContent + '\n' + content;
            break;

          case 'prepend':
            if (content === undefined) {
              return NextResponse.json({ error: 'Prepend operation requires content parameter' }, { status: 400 });
            }
            newContent = content + '\n' + currentContent;
            break;

          case 'delete_lines':
            if (start_line === undefined) {
              return NextResponse.json({ error: 'Delete lines operation requires start_line parameter' }, { status: 400 });
            }
            const endLine = end_line || start_line;
            lines.splice(start_line - 1, endLine - start_line + 1);
            newContent = lines.join('\n');
            break;

          default:
            return NextResponse.json({ error: 'Invalid operation. Must be: replace, insert, append, prepend, or delete_lines' }, { status: 400 });
        }

        await fs.writeFile(fullPath, newContent, 'utf-8');
        return NextResponse.json({ 
          success: true, 
          operation, 
          path: filePath, 
          new_size: newContent.length,
          action: 'edit'
        });

      case 'read':
        try {
          const fileContent = await fs.readFile(fullPath, 'utf-8');
          return NextResponse.json({ 
            success: true, 
            content: fileContent, 
            path: filePath,
            size: fileContent.length,
            action: 'read'
          });
        } catch (error) {
          return NextResponse.json({ 
            error: `Failed to read file: ${error instanceof Error ? error.message : 'File not found'}` 
          }, { status: 404 });
        }

      case 'delete':
        try {
          await fs.unlink(fullPath);
          return NextResponse.json({ 
            success: true, 
            path: filePath,
            action: 'delete'
          });
        } catch (error) {
          return NextResponse.json({ 
            error: `Failed to delete file: ${error instanceof Error ? error.message : 'File not found'}` 
          }, { status: 404 });
        }

      default:
        return NextResponse.json({ error: 'Invalid action. Must be: write, edit, read, or delete' }, { status: 400 });
    }

  } catch (error) {
    console.error('[File API] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const filePath = url.searchParams.get('path') || '';
  
  // Validate path
  const pathValidation = validatePath(filePath);
  if (!pathValidation.isValid) {
    return NextResponse.json({ error: pathValidation.error }, { status: 400 });
  }

  try {
    const fullPath = path.join('/root/.openclaw/workspace', filePath);
    
    if (filePath === '' || filePath === '.') {
      // List directory contents
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return NextResponse.json({
        success: true,
        path: filePath,
        files: entries
          .filter(e => e.isFile())
          .map(e => e.name),
        directories: entries
          .filter(e => e.isDirectory())
          .map(e => e.name),
        action: 'list'
      });
    } else {
      // Read file
      const fileContent = await fs.readFile(fullPath, 'utf-8');
      return NextResponse.json({
        success: true,
        content: fileContent,
        path: filePath,
        size: fileContent.length,
        action: 'read'
      });
    }
  } catch (error) {
    return NextResponse.json({ 
      error: `Failed to access path: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 404 });
  }
}