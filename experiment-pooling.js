'use strict';

import puppeteer from "puppeteer"
import { SingleBrowserMultiplePagesPool, FixedBrowsersWithSinglePagePool } from "./pools.js"
import { replicate } from "./collections.js"
import { sequence, parallel } from "./concurrency.js"
import { randomString, randomNum } from "./random.js"
import { measureHeightsWithDefaultSetup } from "./render.js";

// Notes:
//  - if services dies browsers will leave without explicit shutdown
//  - caching on V8/browser/? impacts rendering the same text

// Experimenting with Browser/Page pools in one app to mitigate parallelism 
;(async () => {
  console.time(`init`)

  const pages = new SingleBrowserMultiplePagesPool(await puppeteer.launch(), 8, 8)
  // parallel n=100000,p=4|39.816s n=100000,p=8|38.840s(2574 batches/s) n=100000,p=10|47.440s n=100000,p=20|51.208s n=100000,p=40|53.649s
  // parallel texts=random[1,10) n=100000,p=8|50.600s
  // parallel texts=random[1,20) n=100000,p=8|1:22.472
  // sequence n=100000|1:38.321
  // const pages = new FixedBrowsersWithSinglePagePool(async () => puppeteer.launch(), 8)
  // parallel texts=4 n=1000,p=8|558.7ms n=1000,p=10|630.8ms n=1000,p=20|848.8ms n=100000,p=8|50.191s n=100000,p=16|1:01.462 n=100000,p=30|56.983s
  // parallel texts=26 n=100000,p=8|2:00.042
  // parallel texts=26 scripts=2 n=100000,p=8|4:34.084
  // parallel texts=random[1,10) n=100000,p=8|1:02.559
  // parallel texts=random[1,20) n=100000,p=8|1:31.773
  // sequence n=100000|1:34.486
  // Static samples
  // const samples = [
  //   "<p>Small test text, really small</p>",
  //   "<p>Multiline test text</p><p>Just to check this case</p>",
  //   '<p>Das Haus Wettin ist mit über 1000 Jahren Familiengeschichte eines der ältesten urkundlich nachgewiesenen Geschlechter des deutschen <a href="" target="_blank">Hochadels</a>, dem eine historische Bedeutung für die Landesgeschichte der Bundesländer <a href="" target="_blank">Sachsen</a>',
  //   "<p>Some <b>bold</b> text just to be sure styling is present and everything is rendered as it shoul <i>be</i></p>"
  // ]
  // Dynamic samples
  function samplesProvider() {
    return [...new Array(randomNum(1, 10))]
      .map(_ => "<p>" + randomString(30, 400) + "</p>")
  }

  await pages.whenReady()
  
  console.timeEnd(`init`)
  console.time(`test all`)
  
  await parallel(100, async (i) => {
    const page = await pages.get()
    const samples = samplesProvider()
    
    console.time(`test render #${i}[page ${page.id}] samples=${samples.length}`)
    
    const result = await page.evaluate(measureHeightsWithDefaultSetup, samples)

    console.timeEnd(`test render #${i}[page ${page.id}] samples=${samples.length}`)
    // console.log(`Received result #${i}: ${result}`)

    pages.return(page)
  })

  console.timeEnd(`test all`)

  await pages.close();
})()
