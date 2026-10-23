// Copies the OCR engine and French data into public/ocr/, so the app serves them itself (no third-party CDN).
import { copyFileSync, mkdirSync } from 'node:fs'
import { basename } from 'node:path'

const files = [
  'node_modules/tesseract.js/dist/worker.min.js',
  'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js',
  'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  'node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js',
  'node_modules/@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz',
]

mkdirSync('public/ocr', { recursive: true })
for (const file of files) copyFileSync(file, `public/ocr/${basename(file)}`)
