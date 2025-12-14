export interface Note {
  id: string;
  title: string;
  file_path: string;
  created_at: number;
  modified_at: number;
  deleted_at: number | null;
  word_count: number;
  character_count: number;
}

export interface Tag {
  id: number;
  name: string;
  created_at: number;
}

export interface NoteTag {
  note_id: string;
  tag_id: number;
}

export interface NoteWithContent extends Note {
  content: string;
  tags: string[];
}

export interface CreateNoteInput {
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdateNoteInput {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
}
