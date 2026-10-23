/** Version web : téléchargement direct de l'image. */
export async function sharePng(base64: string, fileName: string): Promise<void> {
  const a = document.createElement('a');
  a.href = `data:image/png;base64,${base64}`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
