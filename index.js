const events = require("events")
const express = require("express")
const puppeteer = require("puppeteer")

const app = express()

const batchLimit = 300

class SingleBrowserMultiplePagesPool {
  #browser = null
  // Promise to wait for if #populate() execution started
  #populating = null
  #busyPagesPool = new Set()
  #maxSize = null
  #queue = new AsyncQueue(null, true)
  #idx = 0

  constructor(browser, initialSize, maxSize) {
    this.#browser = browser

    var initialSize = initialSize || 1
    this.#populate(initialSize)
    
    if (!isNaN(maxSize) && maxSize >= initialSize) {
      this.#maxSize = maxSize
    }
  }

  async whenReady() {
    await this.populating
  }

  async get() {
    // console.log(`free size is ${this.#freePagesPool.length}, busy size is ${this.#busyPagesPool.size}`)
    const numberToPopulate = this.#shouldPopulate()
    if (numberToPopulate > 0) {
      this.#populate(numberToPopulate)
    }

    return this.#queue.dequeue()
      .then(page => {
        this.#busyPagesPool.add(page)
        return page
      })
  }

  return(page) {
    if (this.#busyPagesPool.delete(page)) {
      // console.log("<<<<<< returned a page")
      this.#queue.enqueue(page)
    }
  }

  async close() {
    if (this.#populating != null) await this.#populating
    return this.#browser.close()
  }

  #shouldPopulate() {
    let shouldPopulateAhead = this.#queue.size() < this.#busyPagesPool.size / 4
    if (shouldPopulateAhead && this.#maxSize) {
      let currentSize = this.#queue.size() + this.#busyPagesPool.size
      if (currentSize < this.#maxSize) {
        return Math.min(this.#busyPagesPool.size, this.#maxSize - currentSize) 
      }
    }
    if (shouldPopulateAhead) {
      return this.#busyPagesPool.size
    }
    return 0
  }

  #populate(size) {
    if (this.#populating != null) return

    // console.log(`populating !!!!!!!! ${size}`)
    this.#populating = parallel(size, async () => {
      let page = await this.#browser.newPage()
      
      this.#idx++
      page.id = this.#idx
      
      // console.log(`new page vvvvvvvv`)
      this.#queue.enqueue(page)
    }).then(_ => this.#populating = null)
  }
}

class FixedBrowsersWithSinglePagePool {
  #browsers = []
  #busyPagesPool = new Set()
  // Promise to wait for if #populate()
  #ready = null
  #queue = new AsyncQueue(null, true)

  constructor(asyncGetBrowser, size) {
    this.#populate(asyncGetBrowser, size)
  }

  async whenReady() {
    await this.#ready
  }

  async get() {
    return this.#queue.dequeue()
      .then(page => {
        this.#busyPagesPool.add(page)
        // console.log(`>>>>>> obtained a page ${page.id}`)
        
        return page
      })
  }

  return(page) {
    if (this.#busyPagesPool.delete(page)) {
      // console.log("<<<<<< returned a page")
      this.#queue.enqueue(page)
    }
  }

  async close() {
    await parallel(this.#browsers.length, async (i) => this.#browsers[i].close())
  }

  #populate(asyncGetBrowser, size) {
    this.#ready = parallel(size, async (i) => {
      const browser = await asyncGetBrowser(i)
      const page = await browser.newPage()
      page.id = i
      
      this.#browsers.push(browser)
      this.#queue.enqueue(page)
    })
  }
}

class AsyncQueue {
  #values = []
  #resolvers = []
  #readFreshValues = false

  constructor(values, readFreshValues) {
    if (Array.isArray(values)) {
      this.#values = values
    }
    this.#readFreshValues = !!readFreshValues
  }

  enqueue(value) {
    if (this.#resolvers.length == 0) {
      this.#values.push(value)
    } else {
      const resolve = this.#resolvers.shift()
      resolve(value)
    }
  }

  async dequeue() {
    if (this.#values.length == 0) {
      return new Promise((resolve) => {
        this.#resolvers.push(resolve)
      })
    } else if (this.#readFreshValues) {
      return this.#values.pop()
    } else {
      return this.#values.shift()
    }
  }

  size() { return this.#values.length }
}

async function parallel(times, asyncFn) {  
  const promises = new Array(times)
  for (let i = 0; i < times; i++) {
    promises[i] = asyncFn(i)
  }
  return Promise.all(promises)
}

async function sequence(times, asyncFn) {  
  const results = new Array(times)
  for (let i = 0; i < times; i++) {
    results[i] = await asyncFn(i)
  }
  return results
}

function replicate(seq, num) {
  const size = seq.length

  var result = []
  for (let i = 0; i < num; i++) {
    result = result.concat(seq)
  }
  return result
}

// Default setup:
//  - default paddings, margins, thikness etc.
//  - text max width 600px
//  - font family OpenSans
function measureHeightsWithDefaultSetup(texts) {
  function putText(text) {
    let div = document.createElement("div");
    
    div.style.width = "600px";
    div.style.fontFamily = "OpenSans";
    div.style.fontSize = "14px";
    div.innerHTML = text;
  
    document.body.append(div);

    return div; 
  }

  const containers = texts.map(putText)

  const results = [];
  for (let container of containers) {
    results.push(container.clientHeight);
  }
  // Clean up
  for (let container of containers) {
    container.remove();
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

// To verify:
//   - does same text rendering lead to caching
;(async () => {
  console.time(`init`)

  // const pages = new SingleBrowserMultiplePagesPool(await puppeteer.launch(), 8, 8)
  // parallel n=100000,p=4|39.816s n=100000,p=8|38.840s(2574 batches/s) n=100000,p=10|47.440s n=100000,p=20|51.208s n=100000,p=40|53.649s
  // sequence n=100000|1:38.321
  const pages = new FixedBrowsersWithSinglePagePool(async () => puppeteer.launch(), 8)
  // parallel n=1000,p=8|558.7ms n=1000,p=10|630.8ms n=1000,p=20|848.8ms n=100000,p=8|50.191s n=100000,p=16|1:01.462 n=100000,p=30|56.983s
  // sequence n=100000|1:34.486

  const examples = [
    "<p>Small test text, really small</p>",
    "<p>Multiline test text</p><p>Just to check this case</p>",
    '<p>Das Haus Wettin ist mit über 1000 Jahren Familiengeschichte eines der ältesten urkundlich nachgewiesenen Geschlechter des deutschen <a href="" target="_blank">Hochadels</a>, dem eine historische Bedeutung für die Landesgeschichte der Bundesländer <a href="" target="_blank">Sachsen</a>',
    "<p>Some <b>bold</b> text just to be sure styling is present and everything is rendered as it shoul <i>be</i></p>"
  ]

  await pages.whenReady()
  
  console.timeEnd(`init`)
  console.time(`test all`)
  
  await parallel(100000, async (i) => {
    const page = await pages.get()
    
    console.time(`test render #${i}[page ${page.id}]`)
    
    const result = await page.evaluate(measureHeightsWithDefaultSetup, examples)

    console.timeEnd(`test render #${i}[page ${page.id}]`)
    // console.log(`Received result #${i}: ${result}`)

    pages.return(page)
  })

  console.timeEnd(`test all`)

  await pages.close();
})()
