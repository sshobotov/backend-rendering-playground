'use strict';

// import cluster from "cluster"
import { cpus } from "os"
import express from "express"
import puppeteer from "puppeteer"
import { randomString, randomNum } from "./random.js"
import { parallel } from "./concurrency.js"
import { CircularPool } from "./collections.js"
import { measureHeightsWithDefaultSetup } from "./render.js"

const port = 3000
const numCPUs = cpus().length;

// Splitting request per browser/cpu via cluster
//
// > pm2 start experiment-cluster.js -i 0
// > pm2 monit
//
// > loadtest http://localhost:3000 -n 100000 -c 10 -m POST
// or
// > ab -n 100000 -c 10 -m POST http://localhost:3000/
//
// > pm2 stop experiment-cluster.js
//
// - loadtest (npm package):
//
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
//
// - ab (-c 10):
//
// Time taken for tests:   202.168 seconds
// Complete requests:      100000
// Failed requests:        0
// Total transferred:      9800000 bytes
// HTML transferred:       0 bytes
// Requests per second:    494.64 [#/sec] (mean)
// Time per request:       20.217 [ms] (mean)
// Time per request:       2.022 [ms] (mean, across all concurrent requests)
// Transfer rate:          47.34 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0    6 128.6      1   11006
// Processing:     2   14  48.0      8    1507
// Waiting:        1   13  47.6      7    1505
// Total:          2   20 137.0      9   11018

// Percentage of the requests served within a certain time (ms)
//   50%      9
//   66%     11
//   75%     12
//   80%     13
//   90%     19
//   95%     33
//   98%     60
//   99%    251
//  100%  11018 (longest request)
//
// - ab (-c 2):
//
// Time taken for tests:   232.635 seconds
// Complete requests:      100000
// Failed requests:        0
// Total transferred:      9800000 bytes
// HTML transferred:       0 bytes
// Requests per second:    429.86 [#/sec] (mean)
// Time per request:       4.653 [ms] (mean)
// Time per request:       2.326 [ms] (mean, across all concurrent requests)
// Transfer rate:          41.14 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0    1   7.2      0    1000
// Processing:     1    4  13.6      3     641
// Waiting:        1    4  13.3      3     641
// Total:          2    5  15.4      4    1005

// Percentage of the requests served within a certain time (ms)
//   50%      4
//   66%      4
//   75%      4
//   80%      5
//   90%      5
//   95%      6
//   98%      7
//   99%      8
//  100%   1005 (longest request)
//
// Resources: ~80MB per worker, max 13% CPU per worker (12 workers)
;(async () => {
  // if (cluster.isPrimary) {
  //   console.log(`Number of CPUs is ${numCPUs}`)
  //   console.log(`Master ${process.pid} is running`)

  //   // Fork workers
  //   for (let i = 0; i < numCPUs; i++) {
  //     cluster.fork()
  //   }

  //   cluster.on("exit", (worker, code, signal) => {
  //     console.log(`worker ${worker.process.pid} died`)
  //     console.log("Let's fork another worker!")
  //     cluster.fork()
  //   })
  // } else {
    function samplesProvider() {
      return [...new Array(randomNum(1, 20))]
        .map(_ => "<p>" + randomString(30, 400) + "</p>")
    }

    const app = express()
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    // Rotating multiple pages gives no benefits
    // const pages = new CircularPool(await parallel(10, async (i) => {
    //   let page = await browser.newPage()
    //   page.id = i

    //   return page
    // }))

    process.on('exit', (code) => {
      console.log("Shutting down the browser")
      browser.close()
    })
    
    console.log(`Worker ${process.pid} started`)

    app.post("/", async (req, res) => {
      // const page = pages.get()
      const samples = samplesProvider()
      const results = await page.evaluate(measureHeightsWithDefaultSetup, samples)
      // console.log(`results for [pid=${process.pid},page=${page.id}] smaples=${samples.length}: ${results}`)

      res.send()
    })

    app.listen(port, () => {
      console.log(`App listening on port ${port}`)
    })
  // }
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