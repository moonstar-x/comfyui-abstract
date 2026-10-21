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

const FILE_SIZE_FORMATS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'].map((unit) => new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  style: 'unit',
  unit,
  unitDisplay: 'short'
}));

/**
 * Renders a size in bytes with the largest unit that keeps it above 1, such as 1.5 MB.
 */
export const formatFileSize = (bytes: number): string => {
  const exponent = bytes < 1024 ? 0 : Math.min(Math.floor(Math.log2(bytes) / 10), FILE_SIZE_FORMATS.length - 1);
  const format = FILE_SIZE_FORMATS[exponent] ?? new Intl.NumberFormat();

  return format.format(bytes / (1024 ** exponent));
};

/**
 * Saves the file at the URL under its own name. The download attribute alone is ignored for files on another origin, such as the API,
 * so the file is fetched and saved from an object URL instead.
 */
export const downloadFile = async (url: string): Promise<void> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download ${url} (HTTP ${response.status.toString()}).`);
  }

  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '');
  link.click();

  // Revoked on the next tick, once the browser has started the download.
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
};

/**
 * Saves the file like downloadFile, but a file that can't be fetched is opened in a new tab instead, so it can still be saved from there.
 */
export const saveFile = async (url: string): Promise<void> => {
  try {
    await downloadFile(url);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
};
