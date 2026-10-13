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
