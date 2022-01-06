'use strict';

import cluster from "cluster"
import { cpus } from "os"
import express from "express"
import puppeteer from "puppeteer"
import { randomString, randomNum } from "./random.js"
import { measureHeightsWithDefaultSetup } from "./render.js"

const port = 3000
const numCPUs = cpus().length;

// Splitting request per browser/cpu via cluster
// Completed requests:  100000
// Total errors:        0
// Total time:          225.197190639 s
// Requests per second: 444
// Mean latency:        22.5 ms
// 
// Percentage of the requests served within a certain time
//   50%      16 ms
//   90%      24 ms
//   95%      28 ms
//   99%      279 ms
//  100%      1018 ms (longest request)
;(async () => {
  if (cluster.isPrimary) {
    console.log(`Number of CPUs is ${numCPUs}`)
    console.log(`Master ${process.pid} is running`)

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork()
    }

    cluster.on("exit", (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`)
      console.log("Let's fork another worker!")
      cluster.fork()
    })
  } else {
    function samplesProvider() {
      return [...new Array(randomNum(1, 20))]
        .map(_ => "<p>" + randomString(30, 400) + "</p>")
    }

    const app = express()
    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    process.on('exit', (code) => {
      console.log("Shutting down the browser")
      browser.close()
    })
    
    console.log(`Worker ${process.pid} started`)

    app.post("/", async (req, res) => {
      const samples = samplesProvider()
      const results = await page.evaluate(measureHeightsWithDefaultSetup, samples)
      // console.log(`results for [pid=${process.pid}] smaples=${samples.length}: ${results}`)

      res.send()
    })

    app.listen(port, () => {
      console.log(`App listening on port ${port}`)
    })
  }
})()
// ;(async () => {
//   app.post("/", async (req, res) => {
//     const texts = req.body.texts
    
//     if (!Array.isArray(texts) || !texts.every(text => typeof text == "string"))
//       return res.status(400).json({error: 'Invalid request: expected "texts" parameter as an array of strings'})

//     const batch = req.body.batch || 0

//     if (typeof batch != "number" || batch < 1 || batch > batchLimit)
//       return res.status(400).json({error: `Invalid request: expected "batch" parameter to be an integer in [1,$batchLimit] range`})
//   })
// })()