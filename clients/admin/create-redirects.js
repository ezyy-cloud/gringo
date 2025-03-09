// Script to create the correct _redirects file for Netlify
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const redirectsContent = `/api/* https://api.gringo.ezyy.cloud/api/:splat 200
/* /index.html 200`;

const distDir = path.join(__dirname, 'dist');
const redirectsPath = path.join(distDir, '_redirects');

// Ensure the dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Write the _redirects file
fs.writeFileSync(redirectsPath, redirectsContent);

console.log('Created _redirects file in dist directory'); 