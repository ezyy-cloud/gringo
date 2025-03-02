const { generateImages } = require('@vite-pwa/assets-generator')

// Source icon
const source = 'public/chat-icon.svg'

// Generate PWA icons
generateImages(source, {
  outputs: [
    {
      formats: ['png'],
      sizes: [192, 512],
      fileName: 'pwa-[dimension]x[dimension].[format]',
      destination: 'public/'
    }
  ]
}).then(() => {
  console.log('✅ PWA assets generated!')
}).catch(err => {
  console.error('❌ Error generating PWA assets:', err)
}) 