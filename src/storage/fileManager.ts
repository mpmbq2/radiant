import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { CONFIG } from '../config';
import type { NoteFrontmatter } from '../types';

export class FileManager {
  private notesDir: string | null = null;
  private customNotesDir?: string;
  private initialized: boolean = false;

  constructor(notesDir?: string) {
    this.customNotesDir = notesDir;
  }

  private getNotesDir(): string {
    if (!this.notesDir) {
      this.notesDir = this.customNotesDir || CONFIG.NOTES_DIR;
    }
    return this.notesDir;
  }

  private ensureNotesDirectory(): void {
    if (!this.initialized) {
      const dir = this.getNotesDir();
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created notes directory: ${dir}`);
      }
      this.initialized = true;
    }
  }

  /**
   * Generate a file path for a note
   */
  generateFilePath(noteId: string): string {
    this.ensureNotesDirectory();
    return path.join(this.getNotesDir(), `${noteId}.md`);
  }

  /**
   * Write note content to file with frontmatter
   */
  writeNote(
    filePath: string,
    content: string,
    frontmatter: NoteFrontmatter
  ): void {
    this.ensureNotesDirectory();
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
    this.ensureNotesDirectory();
    const dir = this.getNotesDir();

    if (!fs.existsSync(dir)) {
      return [];
    }

    return fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.md'))
      .map((file) => path.join(dir, file));
  }
}

// Singleton instance
export const fileManager = new FileManager();
