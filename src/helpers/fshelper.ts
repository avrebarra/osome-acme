import fs from 'fs';

/**
 * List all files in a directory.
 */
export function listFiles(dir: string): string[] {
  return fs.readdirSync(dir);
}

/**
 * Read multiple files and return their contents as arrays of lines.
 */
export function readFiles(filePaths: string[]): string[][] {
  return filePaths.map((filePath) => {
    return fs.readFileSync(filePath, 'utf-8').trim().split('\n');
  });
}

export async function readFilesAsync(filePaths: string[]): Promise<string[][]> {
  const results = await Promise.all(
    filePaths.map((filePath) => {
      return fs.promises.readFile(filePath, 'utf-8').then((content) => {
        return content.trim().split('\n');
      });
    }),
  );
  return results;
}

/**
 * Write an array of lines to a file.
 */
export function writeFile(filePath: string, lines: string[]): void {
  fs.writeFileSync(filePath, lines.join('\n'));
}
