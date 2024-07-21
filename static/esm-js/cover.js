import { Ppt2Canvas } from './ppt2Canvas.js'

async function drawPptxFun(pptxObj, idx) {
    let canvas = document.createElement('canvas')
    let width = pptxObj.width
    let height = pptxObj.height
    canvas.width = width * 2
    canvas.height = height * 2
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    let ctx = canvas.getContext('2d')
    ctx.scale(2, 2)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    let ppt2Canvas = new Ppt2Canvas(canvas, 'anonymous')
    await ppt2Canvas.drawPptx(pptxObj, idx)
    return ppt2Canvas.getCanvas()
}

// drawPptxFun = async (pptxObj, idx) => return canvas
async function drawCover(pptxObj, drawPptxFun, grayScale) {
    let pages = pptxObj.pages
    if (pages.length == 1) {
        let _canvas = await drawPptxFun(pptxObj, 0, pptxObj.width, pptxObj.height)
        return _canvas.toDataURL()
    }
    async function drawPptxImage(pptxObj, idx) {
        let _canvas = await drawPptxFun(pptxObj, idx)
        let imgSrc = _canvas.toDataURL()
        return new Promise(resolve => {
            let image = new Image()
            image.src = imgSrc
            image.onload = async function() {
                resolve(image)
            }
        })
    }
    // let width = 1200, height = 676
    let width = 600, height = 338
    let canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    let ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    ctx.fillStyle = 'rgb(212, 212, 212)'
    ctx.fillRect(0, 0, width, height)

    let size = 0
    let w = width / 3.3, h = height / 3.3
    for (let i = 1; i < pages.length; i++) {
        size++
        let x = 0
        let y = 0
        if (size == 2 || size == 7) {
            x = w + (width - w * 3) / 2
        } else if (size == 3 || size == 5 || size == 8) {
            x = width - w
        }
        if (size == 4 || size == 5) {
            y = h + (height - h * 3) / 2
        } else if (size > 5) {
            y = height - h
        }
        let image = await drawPptxImage(pptxObj, i)
        ctx.drawImage(image, x, y, w, h)
        if (size == 8) {
            break
        }
    }
    w = width * 0.65
    h = height * 0.65
    let image = await drawPptxImage(pptxObj, 0)
    ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h)
    ctx.rect((width - w) / 2, (height - h) / 2, w, h)
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgb(212, 212, 212)'
    ctx.stroke()
    if (grayScale) {
        // 灰度
        let imageData = ctx.getImageData(0, 0, width, height)
        let data = imageData.data
        for (let i = 0; i < data.length; i += 4) {
            let luminance = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
            data[i] = luminance
            data[i + 1] = luminance
            data[i + 2] = luminance
        }
        ctx.putImageData(imageData, 0, 0)
    }
    return canvas.toDataURL()
}

export { drawPptxFun, drawCover }