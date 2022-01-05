const express = require("express")
const puppeteer = require("puppeteer")

const app = express()

const batchLimit = 300
const initialPoolSize = 2 // 16

class PagePool {
  #browser = null
  #freePagesPool = []
  #busyPagesPool = new Set()
  // Promise to wait for if #populate() execution started
  #populating = null

  constructor(browser, initialSize) {
    this.#browser = browser
    this.#populate(initialSize)
  }

  async get() {
    if (this.#freePagesPool.size < this.#busyPagesPool.size / 4) {
      this.#populate(this.#busyPagesPool.size)
    }

    if (this.#freePagesPool.size > 0) {
      let page = this.#freePagesPool.shift()
      this.#busyPagesPool.add(page)
      return page
    } else {
      await this.#populating
      return await this.get() // Potetntially could lead to StackOverflow
    }
  }

  return(page) {
    if (this.#busyPagesPool.delete(page)) {
      this.#freePagesPool.push(page)
    }
  }

  #populate(size) {
    if (this.#populating != null) return

    const promises = new Array(size)
    for (let i = 0; i < size; i++) {
      promises[i] = this.#browser.newPage().then(page => this.#freePagesPool.push(page))
    }
    this.#populating = Promise.all(promises).then(_ => this.#populating = null)
  }
}

// Default setup:
//  - default paddings, margins, thikness etc.
//  - text max width 600px
//  - font family OpenSans
function measureHeightsWithDefaultSetup(texts) {
  function putText(text) {
    var div = document.createElement("div");
  
    div.style.width = "600px";
    div.style.fontFamily = "OpenSans";
    div.style.fontSize = "14px";
    div.innerHTML = text;
  
    document.body.append(div);

    return div; 
  }

  var containers = texts.map(putText)
  
  var results = [];
  for (let container in containers) {
    results.push(container.clientHeight);
  }
  return results;
}

// ;(async () => {
//   const browser = await puppeteer.launch()
//   const pages = new PagePool(browser, initialPoolSize)

//   app.post("/", async (req, res) => {
//     const texts = req.body.texts
    
//     if (!Array.isArray(texts) || !texts.every(text => typeof text == "string"))
//       return res.status(400).json({error: 'Invalid request: expected "texts" parameter as an array of strings'})

//     const batch = req.body.batch || 0

//     if (typeof batch != "number" || batch < 1 || batch > batchLimit)
//       return res.status(400).json({error: `Invalid request: expected "batch" parameter to be an integer in [1,$batchLimit] range`})

//     const page = await pages.get()
//   })

//   app.listen(() => console.log("Server started"))
  
//   await browser.close()
//   console.log("Server stopped")
// })()

;(async () => {
  const browser = await puppeteer.launch()
  const pages = new PagePool(browser, initialPoolSize)
  
  for (let i = 0; i < 5; i++) {
    let page = await pages.get()
    
    console.time("test render")
    
    var result = await page.evaluate(measureHeightsWithDefaultSetup, [
      "<p>Small test text, really small</p>",
      "<p>Multiline test text</p><p>Just to check this case</p>",
      '<p>Das Haus Wettin ist mit über 1000 Jahren Familiengeschichte eines der ältesten urkundlich nachgewiesenen Geschlechter des deutschen <a href="" target="_blank">Hochadels</a>, dem eine historische Bedeutung für die Landesgeschichte der Bundesländer <a href="" target="_blank">Sachsen</a>',
      "<p>Some <b>bold</b> text just to be sure styling is present and everything is rendered as it shoul <i>be</i></p>"
    ])

    console.timeEnd("test render")
    console.log("Received result " + result)

    pages.return(page)
  }

  await browser.close();
})()
