class PhotoItem {
  canvas = null
  caption = null
  image = null
  id = null
  shapes = []
  text = 'wait for text...'
  baloonCoef = 0.02

  constructor() {
    this.id = (+new Date() + Math.random()).toString();
  }

  /**
   * @link https://docs.opencv.org/3.4/js_contour_features_approxPolyDP.html
   */
  findContours() {
    const minArea = (this.canvas.width * this.canvas.height) * this.baloonCoef

    let src = cv.imread(this.canvas);
    let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
    cv.threshold(src, src, 100, 200, cv.THRESH_BINARY);
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(src, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

    this.shapes = []
    // draw contours with random Scalar
    for (let i = 0; i < contours.size(); ++i) {
      const cont = contours.get(i)
      const area = cv.contourArea(cont)

      if (area < minArea) {
        continue
      }
      this.shapes.push(cv.boundingRect(cont))

      let color = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255),
        Math.round(Math.random() * 255));
      cv.drawContours(dst, contours, i, color, 1, 8, hierarchy, 0);
    }

    cv.imshow(this.id, dst);
  }

  async recognizeText() {
    const parts = [];
    for (let i = 0; i < this.shapes.length; i++) {
      console.log(`${i} of ${this.shapes.length}`)

      const { x, y, width, height } = this.shapes[i]
      const canva = await new BrowserImageManipulation()
        .loadCanvas(this.canvas)
        .crop(width, height, x, y)
        .saveAsCanvas()

      const { data: { text } } = await Tesseract.recognize(canva, 'eng', {
        // logger: m => console.log(m),
      });

      parts.push(text);
      this.text = `${(i/this.shapes.length).toFixed(2)}%: ${parts.filter(v => v).join(' ')}`;
    }

    this.text = `${parts.filter(v => v).join(' ')}`;
  }
}

function photosList() {
  return {
    photos: [],
    async selectPhotos({ target: { files }}) {
      for (const file of files) {
        const item = new PhotoItem()
        item.caption = file.name

        await this.blobToCanvas(file, item)

        this.photos.push(item)

        setTimeout(() => {
          item.findContours()
          item.recognizeText().then(() => {
            // force update
            this.photos = [...this.photos]
          })
        })
      }
    },
    blobToCanvas(blob, item) {
      return new Promise(resolve => {
        const canvas = document.createElement('canvas')
        const img = document.createElement('img')
        const ctx = canvas.getContext('2d')
        img.onload = function () {
          canvas.width = img.width
          canvas.height = img.height
          console.log(canvas.width)
          ctx.drawImage(img,0,0)
          item.canvas = canvas
          item.image = img.src
          resolve(item)
        }
        img.src = URL.createObjectURL(blob);
      })
    },
  }
}
