/** Version web : téléchargement direct et lecture locale du fichier choisi. */
export async function shareExport(json: string, fileName: string): Promise<void> {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pickImportFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      if (f.size > 20 * 1024 * 1024) return reject(new Error('Fichier trop volumineux (20 Mo maximum).'));
      f.text().then(resolve, reject);
    };
    input.click();
  });
}
