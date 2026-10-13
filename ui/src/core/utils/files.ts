export const readAsDataUrl = async (file: File): Promise<string> => await new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    if (typeof reader.result === 'string') {
      resolve(reader.result);
    } else {
      reject(new Error(`Could not read ${file.name}.`));
    }
  });
  reader.addEventListener('error', () => {
    reject(reader.error ?? new Error(`Could not read ${file.name}.`));
  });
  reader.readAsDataURL(file);
});

export const formatMegabytes = (bytes: number): string => `${(bytes / 1024 / 1024).toString()} MB`;
