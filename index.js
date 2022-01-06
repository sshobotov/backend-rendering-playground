'use strict';

import express from "express"
import puppeteer from "puppeteer"
import { SingleBrowserMultiplePagesPool, FixedBrowsersWithSinglePagePool } from "./pool.js"
import { replicate } from "./collections.js"
import { sequence, parallel } from "./concurrency.js"

const app = express()

const batchLimit = 300

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

// Notes:
//  - if services dies browsers will leave without explicit shutdown

// To verify:
//   - does same text rendering lead to caching
;(async () => {
  console.time(`init`)

  // const pages = new SingleBrowserMultiplePagesPool(await puppeteer.launch(), 8, 8)
  // parallel n=100000,p=4|39.816s n=100000,p=8|38.840s(2574 batches/s) n=100000,p=10|47.440s n=100000,p=20|51.208s n=100000,p=40|53.649s
  // sequence n=100000|1:38.321
  const pages = new FixedBrowsersWithSinglePagePool(async () => puppeteer.launch(), 8)
  // parallel texts=4 n=1000,p=8|558.7ms n=1000,p=10|630.8ms n=1000,p=20|848.8ms n=100000,p=8|50.191s n=100000,p=16|1:01.462 n=100000,p=30|56.983s
  // parallel texts=26 n=100000,p=8|2:00.042
  // parallel texts=26 scripts=2 n=100000,p=8|4:34.084
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
  
  await parallel(100, async (i) => {
    const page = await pages.get()
    
    console.time(`test render #${i}[page ${page.id}]`)
    
    const result = await page.evaluate(measureHeightsWithDefaultSetup, replicate(examples, 6))

    console.timeEnd(`test render #${i}[page ${page.id}]`)
    // console.log(`Received result #${i}: ${result}`)

    pages.return(page)
  })

  console.timeEnd(`test all`)

  await pages.close();
})()
