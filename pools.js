import { AsyncQueue, parallel } from "./concurrency.js"

export class SingleBrowserMultiplePagesPool {
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

export class FixedBrowsersWithSinglePagePool {
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