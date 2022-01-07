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
// > ab -n 100000 -c 10 -m POST -k http://localhost:3000/
//
// > pm2 stop experiment-cluster.js
//
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

    // for 20 we have the most reasonable results when loadtesting, influence memory usage
    const pagePoolSize = parseInt(process.env.PAGE_POOL_SIZE || "10", 10)
    const app = express()
    const browser = await puppeteer.launch()
    // const page = await browser.newPage()
    // Rotating multiple pages for one browser improves performance, please see results bellow the code
    // but is needed only if browser and pages pool is kept in memory
    const pages = new CircularPool(await parallel(pagePoolSize, async (i) => {
      let page = await browser.newPage()
      page.id = i

      return page
    }))
    console.log(`Started pool of pages with size: ${pagePoolSize}`)

    process.on('exit', (code) => {
      console.log("Shutting down the browser")
      browser.close()
    })
    
    console.log(`Worker ${process.pid} started`)

    app.post("/", async (req, res) => {
      const page = pages.get()
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
//
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
//
//
// Results
//
// - ab (no keep-alive):
//
// Concurrency Level:      10
// Time taken for tests:   202.168 seconds
// Complete requests:      100000
// Failed requests:        0
// Total transferred:      9800000 bytes
// HTML transferred:       0 bytes
// Requests per second:    494.64 [#/sec] (mean)
// Time per request:       20.217 [ms] (mean)
// Time per request:       2.022 [ms] (mean, across all concurrent requests)
// Transfer rate:          47.34 [Kbytes/sec] received
//
// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0    6 128.6      1   11006
// Processing:     2   14  48.0      8    1507
// Waiting:        1   13  47.6      7    1505
// Total:          2   20 137.0      9   11018
//
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
// - ab (with keep-alive, No CircularPool):
//
// Concurrency Level:      20
// Time taken for tests:   10.934 seconds
// Complete requests:      10000
// Failed requests:        0
// Keep-Alive requests:    0
// Total transferred:      980000 bytes
// HTML transferred:       0 bytes
// Requests per second:    914.60 [#/sec] (mean)
// Time per request:       21.868 [ms] (mean)
// Time per request:       1.093 [ms] (mean, across all concurrent requests)
// Transfer rate:          87.53 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0    0   0.4      0       7
// Processing:     2   21  36.6     11     615
// Waiting:        2   21  36.5     10     615
// Total:          2   22  36.6     11     615

// Percentage of the requests served within a certain time (ms)
//   50%     11
//   66%     17
//   75%     23
//   80%     29
//   90%     53
//   95%     77
//   98%    105
//   99%    124
//  100%    615 (longest request)
//
// - No CircularPool (going >30k requests leads to memeouts)
//
// Concurrency Level:      100
// Time taken for tests:   7.897 seconds
// Complete requests:      10000
// Failed requests:        0
// Keep-Alive requests:    0
// Total transferred:      980000 bytes
// HTML transferred:       0 bytes
// Requests per second:    1266.34 [#/sec] (mean)
// Time per request:       78.967 [ms] (mean)
// Time per request:       0.790 [ms] (mean, across all concurrent requests)
// Transfer rate:          121.19 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0    1   1.8      0      26
// Processing:     2   78  71.7     61     425
// Waiting:        1   77  71.7     60     424
// Total:          2   78  71.7     61     425

// Percentage of the requests served within a certain time (ms)
//   50%     61
//   66%     91
//   75%    114
//   80%    129
//   90%    179
//   95%    216
//   98%    276
//   99%    324
//  100%    425 (longest request)
//
// - 20 pages in CircularPool
//
// Concurrency Level:      120
// Time taken for tests:   111.034 seconds
// Complete requests:      50000
// Failed requests:        0
// Keep-Alive requests:    0
// Total transferred:      4900000 bytes
// HTML transferred:       0 bytes
// Requests per second:    450.31 [#/sec] (mean)
// Time per request:       266.482 [ms] (mean)
// Time per request:       2.221 [ms] (mean, across all concurrent requests)
// Transfer rate:          43.10 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0  127 1421.8      1   19073
// Processing:     2  139 102.6    127    2537
// Waiting:        2  132  99.6    126    2537
// Total:          2  266 1420.4    130   19317

// Percentage of the requests served within a certain time (ms)
//   50%    130
//   66%    138
//   75%    146
//   80%    157
//   90%    199
//   95%    381
//   98%    556
//   99%    785
//  100%  19317 (longest request)
//
//
// Concurrency Level:      120
// Time taken for tests:   982.813 seconds
// Complete requests:      500000
// Failed requests:        0
// Keep-Alive requests:    0
// Total transferred:      49000000 bytes
// HTML transferred:       0 bytes
// Requests per second:    508.74 [#/sec] (mean)
// Time per request:       235.875 [ms] (mean)
// Time per request:       1.966 [ms] (mean, across all concurrent requests)
// Transfer rate:          48.69 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0   97 469.5      2   19461
// Processing:     1  138 141.1    120    2444
// Waiting:        0  130 134.3    116    2432
// Total:          1  235 475.8    132   19616

// Percentage of the requests served within a certain time (ms)
//   50%    132
//   66%    152
//   75%    172
//   80%    194
//   90%    573
//   95%   1039
//   98%   1120
//   99%   1277
//  100%  19616 (longest request)
//
// Concurrency Level:      20
// Time taken for tests:   1102.351 seconds
// Complete requests:      500000
// Failed requests:        0
// Keep-Alive requests:    0
// Total transferred:      49000000 bytes
// HTML transferred:       0 bytes
// Requests per second:    453.58 [#/sec] (mean)
// Time per request:       44.094 [ms] (mean)
// Time per request:       2.205 [ms] (mean, across all concurrent requests)
// Transfer rate:          43.41 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0   17 477.3      0   20326
// Processing:     2   26  41.3     21    1042
// Waiting:        0   26  40.4     21    1041
// Total:          2   44 478.8     22   20338

// Percentage of the requests served within a certain time (ms)
//   50%     22
//   66%     24
//   75%     26
//   80%     28
//   90%     32
//   95%     37
//   98%     55
//   99%    316
//  100%  20338 (longest request)
//
// - 40 pages in CircularPool
//
// Concurrency Level:      120
// Time taken for tests:   203.438 seconds
// Complete requests:      50000
// Failed requests:        0
// Keep-Alive requests:    0
// Total transferred:      4900000 bytes
// HTML transferred:       0 bytes
// Requests per second:    245.78 [#/sec] (mean)
// Time per request:       488.251 [ms] (mean)
// Time per request:       4.069 [ms] (mean, across all concurrent requests)
// Transfer rate:          23.52 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0    5  15.3      0     619
// Processing:     7  483 498.4    295    9346
// Waiting:        6  467 483.5    283    9308
// Total:         17  487 496.2    297    9347

// Percentage of the requests served within a certain time (ms)
//   50%    297
//   66%    427
//   75%    572
//   80%    714
//   90%   1103
//   95%   1354
//   98%   1765
//   99%   2289
//  100%   9347 (longest request)
//
// Going -c >130 can't be handled, connections was dropped