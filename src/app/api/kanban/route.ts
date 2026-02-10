import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface KanbanTask {
  id: string;
  text: string;
  column_id: 'todo' | 'progress' | 'done';
  position: number;
  created_at: string;
  updated_at: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  tasks: KanbanTask[];
}

// GET - Fetch all tasks grouped by column
export async function GET() {
  try {
    const { data: tasks, error } = await supabase
      .from('kanban_tasks')
      .select('*')
      .order('position', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    // Group tasks by column with proper typing
    const columns: KanbanColumn[] = [
      {
        id: 'todo',
        title: 'To Do',
        color: '#f59e0b',
        tasks: tasks?.filter(task => task.column_id === 'todo') || []
      },
      {
        id: 'progress', 
        title: 'In Progress',
        color: '#667eea',
        tasks: tasks?.filter(task => task.column_id === 'progress') || []
      },
      {
        id: 'done',
        title: 'Done', 
        color: '#22c55e',
        tasks: tasks?.filter(task => task.column_id === 'done') || []
      }
    ];

    return NextResponse.json({ columns });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add new task
export async function POST(request: NextRequest) {
  try {
    const { text, column_id } = await request.json();

    if (!text || !column_id) {
      return NextResponse.json(
        { error: 'Text and column_id are required' },
        { status: 400 }
      );
    }

    if (!['todo', 'progress', 'done'].includes(column_id)) {
      return NextResponse.json(
        { error: 'Invalid column_id' },
        { status: 400 }
      );
    }

    // Get the next position number for this column
    const { data: maxPositionData } = await supabase
      .from('kanban_tasks')
      .select('position')
      .eq('column_id', column_id)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = (maxPositionData?.[0]?.position || 0) + 1;

    const { data, error } = await supabase
      .from('kanban_tasks')
      .insert({
        text: text.trim(),
        column_id,
        position: nextPosition
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    return NextResponse.json({ task: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update task (move between columns or update position)
export async function PATCH(request: NextRequest) {
  try {
    const { id, column_id, position, text } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const updates: Partial<KanbanTask> = {};
    
    if (column_id && ['todo', 'progress', 'done'].includes(column_id)) {
      updates.column_id = column_id;
    }
    
    if (typeof position === 'number') {
      updates.position = position;
    }
    
    if (text !== undefined) {
      updates.text = text.trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('kanban_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task: data });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete task by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('kanban_tasks')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}