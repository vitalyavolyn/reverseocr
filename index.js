import { createWorker } from 'tesseract.js'
import axios from 'axios'
import canvas from 'canvas'
import { VK } from 'vk-io'

import { token, groupId } from './config.js'

// User token
const vk = new VK({ token })

const { createCanvas, Image } = canvas

const getRandomWord = async () => {
  // Get a random noun (from a random API, probably should replace it)
  const res = await axios.get('http://free-generator.ru/generator.php?action=word&type=1')

  return res.data.word.word
}

const word = await getRandomWord()
console.log(`The word is: ${word}`)

// The worker for OCR
const worker = createWorker()

await worker.load()
await worker.loadLanguage('rus')
await worker.initialize('rus')

// The canvas with final results
const mainCanvas = createCanvas(word.length * 100, 200)
// The canvas to draw letters on
const drawCanvas = createCanvas(100, 200)

const ctx = mainCanvas.getContext('2d')
const dCtx = drawCanvas.getContext('2d')

ctx.fillStyle = 'white'
ctx.fillRect(0, 0, word.length * 100, 200)

dCtx.lineWidth = 2

// Draw N random lines
const drawGlyph = (ctx, x, y, n) => {
  ctx.beginPath()
  ctx.moveTo(x,y)
  for (let i = 0; i < n; i++) {
    x += Math.random() * 80 - 40
    y += Math.random() * 80 - 40
    ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.stroke()
}

const ocr = async (canvas) => {
  const result = await worker.recognize(canvas.toBuffer('image/png'))
  return result.data.text.trim().toLowerCase()// .replace(/[^а-яё]/g, '') (Removed because this is cheating)
}

let finalWord = ''

for (let [index, letter] of [...word].entries()) {
  for (let i = 0; i < 80_000;  i++) {
    // Clear canvas
    dCtx.fillStyle = 'white'
    dCtx.fillRect(0, 0, 100, 200)
    dCtx.fillStyle = 'black'

    // Draw a thing on small canvas
    drawGlyph(dCtx, 50, 100, 20)

    const result = await ocr(drawCanvas)
    if (result === letter) {
      console.log('match', letter)
      finalWord += result

      // Add letter to main canvas
      const img = new Image()
      img.src = drawCanvas.toBuffer()
      ctx.drawImage(img, index * 100, 0)

      i = 80_000
    }

    // If this is the last iteration
    if (i === 80_000 - 1) {
      finalWord += ' '
    }
  }
}

console.log(finalWord)

const photo = await vk.upload.wallPhoto({
  group_id: groupId,
  source: { value: mainCanvas.toBuffer('image/png') }
})

await vk.api.wall.post({
  owner_id: -groupId,
  message: finalWord,
  attachments: photo.toString()
})

process.exit(0)
