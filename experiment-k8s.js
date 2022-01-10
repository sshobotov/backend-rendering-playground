'use strict';

import express from "express"
import puppeteer from "puppeteer"
import { randomString, randomNum } from "./random.js"
import { measureHeightsWithDefaultSetup } from "./render.js"

function samplesProvider() {
  var samples = []
  for (let i = 0; i < randomNum(1, 20); i++) {
    samples.push("<p>" + randomString(30, 400) + "</p>")
  }
  return samples
}

const port = 3000

;(async () => {
  const app = express()
  const browser = await puppeteer.launch({
    args: ["--no-sandbox"]
  })
  const page = await browser.newPage()

  process.on('exit', (code) => {
    console.log("Shutting down the browser")
    browser.close()
  })

  app.post("/", async (req, res) => {
    const samples = samplesProvider()
    const results = await page.evaluate(measureHeightsWithDefaultSetup, samples)

    res.json({"success": results})
  })

  app.post("/healthz", (req, res) => {
    res.send()
  })

  app.listen(port, () => {
    console.log(`App listening on port ${port}`)
  })
})()
// Results
//
// - 1 pod (2 CPU, 1Gi, PAGE_POOL_SIZE=1)
//
// Concurrency Level:      240
// Time taken for tests:   66.359 seconds
// Complete requests:      30000
// Failed requests:        25577
//    (Connect: 0, Receive: 0, Length: 25577, Exceptions: 0)
// Keep-Alive requests:    30000
// Total transferred:      7905409 bytes
// HTML transferred:       855409 bytes
// Requests per second:    452.09 [#/sec] (mean)
// Time per request:       530.870 [ms] (mean)
// Time per request:       2.212 [ms] (mean, across all concurrent requests)
// Transfer rate:          116.34 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0    0   1.4      0      24
// Processing:    35  529  69.9    510    1039
// Waiting:       11  529  69.9    510    1039
// Total:         35  529  69.6    510    1039

// Percentage of the requests served within a certain time (ms)
//   50%    510
//   66%    532
//   75%    559
//   80%    576
//   90%    602
//   95%    630
//   98%    711
//   99%    751
//  100%   1039 (longest request)
//
// Resource allocation: CPU 1998m, Memory 163Mi
//
// - 2 pods (2 CPU, 1Gi, PAGE_POOL_SIZE=1)
//
// Concurrency Level:      240
// Time taken for tests:   44.132 seconds
// Complete requests:      30000
// Failed requests:        29956
//    (Connect: 0, Receive: 0, Length: 29956, Exceptions: 0)
// Keep-Alive requests:    30000
// Total transferred:      7904854 bytes
// HTML transferred:       854854 bytes
// Requests per second:    679.77 [#/sec] (mean)
// Time per request:       353.058 [ms] (mean)
// Time per request:       1.471 [ms] (mean, across all concurrent requests)
// Transfer rate:          174.92 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0    0   1.5      0      26
// Processing:    34  352  43.4    344     623
// Waiting:        9  352  43.4    344     623
// Total:         35  352  43.1    344     623

// Percentage of the requests served within a certain time (ms)
//   50%    344
//   66%    362
//   75%    375
//   80%    383
//   90%    407
//   95%    426
//   98%    454
//   99%    473
//  100%    623 (longest request)
//
// Resource allocation (per pod): CPU 1827m, Memory 135Mi
//
// - 1 pod (4 CPU, 1Gi, PAGE_POOL_SIZE=1)
//
// Concurrency Level:      240
// Time taken for tests:   64.334 seconds
// Complete requests:      30000
// Failed requests:        27685
//    (Connect: 0, Receive: 0, Length: 27685, Exceptions: 0)
// Keep-Alive requests:    30000
// Total transferred:      7905404 bytes
// HTML transferred:       855404 bytes
// Requests per second:    466.32 [#/sec] (mean)
// Time per request:       514.673 [ms] (mean)
// Time per request:       2.144 [ms] (mean, across all concurrent requests)
// Transfer rate:          120.00 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0    0   1.4      0      25
// Processing:    35  512 123.4    475    1538
// Waiting:       11  512 123.4    475    1538
// Total:         35  513 123.2    475    1538

// Percentage of the requests served within a certain time (ms)
//   50%    475
//   66%    519
//   75%    545
//   80%    567
//   90%    649
//   95%    711
//   98%    872
//   99%   1003
//  100%   1538 (longest request)
//
// Resource allocation: CPU 2273m, Memory 167Mi
//
// - 2 pods (1 CPU, 1Gi)
//
// Concurrency Level:      240
// Time taken for tests:   129.599 seconds
// Complete requests:      30000
// Failed requests:        27739
//    (Connect: 0, Receive: 0, Length: 27739, Exceptions: 0)
// Keep-Alive requests:    30000
// Total transferred:      7905896 bytes
// HTML transferred:       855896 bytes
// Requests per second:    231.48 [#/sec] (mean)
// Time per request:       1036.792 [ms] (mean)
// Time per request:       4.320 [ms] (mean, across all concurrent requests)
// Transfer rate:          59.57 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0    0   1.7      0      28
// Processing:    64 1033 191.1    997    2173
// Waiting:       37 1033 191.1    997    2173
// Total:         64 1033 190.8    997    2173

// Percentage of the requests served within a certain time (ms)
//   50%    997
//   66%   1082
//   75%   1112
//   80%   1174
//   90%   1287
//   95%   1380
//   98%   1530
//   99%   1698
//  100%   2173 (longest request)
//
// Resource allocation (per pod): CPU 1000m, Memory 140Mi 
//
// - 1 pod (1 CPU, 1Gi, PAGE_POOL_SIZE=1)
//
// Concurrency Level:      240
// Time taken for tests:   211.542 seconds
// Complete requests:      30000
// Failed requests:        26162
//    (Connect: 0, Receive: 0, Length: 26162, Exceptions: 0)
// Keep-Alive requests:    30000
// Total transferred:      7908110 bytes
// HTML transferred:       858110 bytes
// Requests per second:    141.82 [#/sec] (mean)
// Time per request:       1692.340 [ms] (mean)
// Time per request:       7.051 [ms] (mean, across all concurrent requests)
// Transfer rate:          36.51 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0    0   1.1      0      20
// Processing:   128 1685 178.7   1677    2577
// Waiting:      108 1685 178.7   1677    2577
// Total:        128 1685 178.5   1677    2577

// Percentage of the requests served within a certain time (ms)
//   50%   1677
//   66%   1704
//   75%   1776
//   80%   1794
//   90%   1892
//   95%   2018
//   98%   2193
//   99%   2288
//  100%   2577 (longest request)
//
// Resource allocation: CPU 1000m, Memory 169Mi
//
// - 1 pod (2 CPU, 1Gi, PAGE_POOL_SIZE=20)
//
// Concurrency Level:      200
// Time taken for tests:   156.525 seconds
// Complete requests:      30000
// Failed requests:        25947
//    (Connect: 0, Receive: 0, Length: 25947, Exceptions: 0)
// Keep-Alive requests:    30000
// Total transferred:      7902706 bytes
// HTML transferred:       852706 bytes
// Requests per second:    191.66 [#/sec] (mean)
// Time per request:       1043.499 [ms] (mean)
// Time per request:       5.217 [ms] (mean, across all concurrent requests)
// Transfer rate:          49.31 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0    0   0.8      0      15
// Processing:    23 1042 226.9   1010    2272
// Waiting:        8 1042 226.9   1010    2272
// Total:         23 1042 226.8   1010    2272

// Percentage of the requests served within a certain time (ms)
//   50%   1010
//   66%   1106
//   75%   1185
//   80%   1204
//   90%   1322
//   95%   1419
//   98%   1591
//   99%   1690
//  100%   2272 (longest request)
//
// Resource allocation: CPU 1602m, Memory 597Mi 
