import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const PUBLIC_DIR = path.resolve('public');
const SRC_ASSETS_DIR = path.resolve('src/assets');
const OUTPUT_DIR = path.resolve('public/optimized');

// Ensure output directory exists
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// Process images in a directory
async function processImagesInDir(dir, outputBaseDir) {
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        // Create corresponding output directory
        const nestedOutputDir = path.join(outputBaseDir, file.name);
        await ensureDir(nestedOutputDir);
        
        // Process nested directory
        await processImagesInDir(filePath, nestedOutputDir);
        continue;
      }
      
      // Check if file is an image
      const ext = path.extname(file.name).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
        continue;
      }
      
      // Create output paths for different sizes
      const fileName = path.basename(file.name, ext);
      const outputPath = path.join(outputBaseDir, `${fileName}${ext}`);
      const outputPathSmall = path.join(outputBaseDir, `${fileName}-small${ext}`);
      const outputPathThumb = path.join(outputBaseDir, `${fileName}-thumb${ext}`);
      const outputWebP = path.join(outputBaseDir, `${fileName}.webp`);
      const outputAvif = path.join(outputBaseDir, `${fileName}.avif`);
      
      // Process image
      const image = sharp(filePath);
      const metadata = await image.metadata();
      
      // Skip already optimized images (if they exist and are newer)
      try {
        const origStat = await fs.stat(filePath);
        const optStat = await fs.stat(outputPath);
        
        if (optStat.mtime > origStat.mtime) {
          console.log(`Skipping already optimized ${file.name}`);
          continue;
        }
      } catch (e) {
        // File doesn't exist, continue with optimization
      }
      
      console.log(`Optimizing ${file.name}...`);
      
      // Original size but optimized
      await image.clone()
        .resize(Math.min(metadata.width, 1200))
        .toFile(outputPath);
      
      // Medium size (for regular display)
      if (metadata.width > 600) {
        await image.clone()
          .resize(600)
          .toFile(outputPathSmall);
      }
      
      // Thumbnail
      if (metadata.width > 200) {
        await image.clone()
          .resize(200)
          .toFile(outputPathThumb);
      }
      
      // WebP version
      await image.clone()
        .resize(Math.min(metadata.width, 1200))
        .webp({ quality: 80 })
        .toFile(outputWebP);
      
      // AVIF version
      try {
        await image.clone()
          .resize(Math.min(metadata.width, 1200))
          .avif({ quality: 65 })
          .toFile(outputAvif);
      } catch (error) {
        console.warn(`Error creating AVIF for ${file.name}:`, error.message);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dir}:`, error);
  }
}

// Main function
async function optimizeImages() {
  console.log('Starting image optimization...');
  
  try {
    // Ensure output directory exists
    await ensureDir(OUTPUT_DIR);
    
    // Process public directory images
    await processImagesInDir(PUBLIC_DIR, OUTPUT_DIR);
    
    // Process src/assets directory images
    await processImagesInDir(SRC_ASSETS_DIR, OUTPUT_DIR);
    
    console.log('Image optimization complete!');
  } catch (error) {
    console.error('Error during image optimization:', error);
    process.exit(1);
  }
}

optimizeImages(); 