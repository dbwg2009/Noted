@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light dark;
}

html, body {
  height: 100%;
}

body {
  @apply bg-neutral-50 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100;
}
