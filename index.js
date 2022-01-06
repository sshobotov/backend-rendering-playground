const events = require("events")
const express = require("express")
const { resolve } = require("path")
const puppeteer = require("puppeteer")

const app = express()

const batchLimit = 300
const initialPoolSize = 16

class SingleBrowserInfinitePagesPool {
  #browser = null
  #freePagesPool = []
  #busyPagesPool = new Set()
  // Promise to wait for if #populate() execution started
  #populating = null

  constructor(browser, initialSize) {
    this.#browser = browser
    this.#populate(initialSize)
  }

  async whenReady() {
    await this.populating
  }

  async get() {
    // console.log(`free size is ${this.#freePagesPool.length}, busy size is ${this.#busyPagesPool.size}`)
    if (this.#freePagesPool.length < this.#busyPagesPool.size / 4) {
      this.#populate(this.#busyPagesPool.size)
    }

    if (this.#freePagesPool.length > 0) {
      let page = this.#freePagesPool.pop()
      this.#busyPagesPool.add(page)
      // console.log(">>>>>> obtained a page")
      return page
    } else {
      await this.#populating
      return this.get() // Potentially could lead to StackOverflow
    }
  }

  return(page) {
    if (this.#busyPagesPool.delete(page)) {
      // console.log("<<<<<< returned a page")
      this.#freePagesPool.push(page)
    }
  }

  async close() {
    return this.#browser.close()
  }

  #populate(size) {
    if (this.#populating != null) return

    // console.log(`populating !!!!!!!! ${size}`)
    this.#populating = parallel(size, async () => {
      let page = await this.#browser.newPage()
      // console.log(`new page vvvvvvvv`)
      this.#freePagesPool.push(page)
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
  const pages = new SingleBrowserInfinitePagesPool(await puppeteer.launch(), initialPoolSize)
  // const pages = new FixedBrowsersWithSinglePagePool(async () => puppeteer.launch(), 10) // number of CPUs to utilize, parallelizm

  const examples = [
    "<p>Small test text, really small</p>",
    "<p>Multiline test text</p><p>Just to check this case</p>",
    '<p>Das Haus Wettin ist mit über 1000 Jahren Familiengeschichte eines der ältesten urkundlich nachgewiesenen Geschlechter des deutschen <a href="" target="_blank">Hochadels</a>, dem eine historische Bedeutung für die Landesgeschichte der Bundesländer <a href="" target="_blank">Sachsen</a>',
    "<p>Some <b>bold</b> text just to be sure styling is present and everything is rendered as it shoul <i>be</i></p>"
  ]

  await pages.whenReady()

  console.time(`test all`)
  
  await sequence(100, async (i) => {
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
