// Applies the saved theme before the first paint. Kept out of index.html so the CSP doesn't need to allow inline scripts.
try {
  const theme = localStorage.getItem('comfyui-abstract-theme');
  const dark = theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
} catch {}
