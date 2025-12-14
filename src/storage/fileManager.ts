import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { CONFIG } from '../config';

export interface NoteFrontmatter {
  title: string;
  tags: string[];
  created_at: number;
  modified_at: number;
}

export class FileManager {
  private notesDir: string;

  constructor(notesDir?: string) {
    this.notesDir = notesDir || CONFIG.NOTES_DIR;
    this.ensureNotesDirectory();
  }

  private ensureNotesDirectory(): void {
    if (!fs.existsSync(this.notesDir)) {
      fs.mkdirSync(this.notesDir, { recursive: true });
      console.log(`Created notes directory: ${this.notesDir}`);
    }
  }

  /**
   * Generate a file path for a note
   */
  generateFilePath(noteId: string): string {
    return path.join(this.notesDir, `${noteId}.md`);
  }

  /**
   * Write note content to file with frontmatter
   */
  writeNote(
    filePath: string,
    content: string,
    frontmatter: NoteFrontmatter
  ): void {
    const fileContent = matter.stringify(content, frontmatter);
    fs.writeFileSync(filePath, fileContent, 'utf-8');
    console.log(`Note written to: ${filePath}`);
  }

  /**
   * Read note content from file
   */
  readNote(filePath: string): { content: string; frontmatter: NoteFrontmatter } {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Note file not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(fileContent);

    return {
      content: parsed.content,
      frontmatter: parsed.data as NoteFrontmatter,
    };
  }

  /**
   * Delete note file
   */
  deleteNote(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Note deleted: ${filePath}`);
    }
  }

  /**
   * Check if note file exists
   */
  noteExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Get all note file paths
   */
  getAllNoteFiles(): string[] {
    if (!fs.existsSync(this.notesDir)) {
      return [];
    }

    return fs
      .readdirSync(this.notesDir)
      .filter((file) => file.endsWith('.md'))
      .map((file) => path.join(this.notesDir, file));
  }
}

// Singleton instance
export const fileManager = new FileManager();
