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
// - 2 pods (1 CPU, 1Gi)
// Concurrency Level:      100
// Time taken for tests:   198.385 seconds
// Complete requests:      30000
// Failed requests:        25459
//    (Connect: 0, Receive: 0, Length: 25459, Exceptions: 0)
// Keep-Alive requests:    30000
// Total transferred:      7901906 bytes
// HTML transferred:       851906 bytes
// Requests per second:    151.22 [#/sec] (mean)
// Time per request:       661.283 [ms] (mean)
// Time per request:       6.613 [ms] (mean, across all concurrent requests)
// Transfer rate:          38.90 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0    0   0.2      0       7
// Processing:    18  660 217.6    604    1774
// Waiting:       11  660 217.6    604    1774
// Total:         18  660 217.6    604    1774

// Percentage of the requests served within a certain time (ms)
//   50%    604
//   66%    703
//   75%    793
//   80%    814
//   90%    977
//   95%   1082
//   98%   1202
//   99%   1320
//  100%   1774 (longest request)
//
// - 4 pods (1 CPU, 1Gi)
// Concurrency Level:      100
// Time taken for tests:   202.691 seconds
// Complete requests:      30000
// Failed requests:        25583
//    (Connect: 0, Receive: 0, Length: 25583, Exceptions: 0)
// Keep-Alive requests:    30000
// Total transferred:      7902514 bytes
// HTML transferred:       852514 bytes
// Requests per second:    148.01 [#/sec] (mean)
// Time per request:       675.638 [ms] (mean)
// Time per request:       6.756 [ms] (mean, across all concurrent requests)
// Transfer rate:          38.07 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0    0   0.5      0      14
// Processing:   110  674 306.3    600    2669
// Waiting:      105  674 306.3    600    2669
// Total:        110  674 306.3    600    2669

// Percentage of the requests served within a certain time (ms)
//   50%    600
//   66%    710
//   75%    814
//   80%    901
//   90%   1100
//   95%   1291
//   98%   1476
//   99%   1598
//  100%   2669 (longest request)
//
// - 8 pods (0.6 CPU, 500Mi)
//
// Concurrency Level:      200
// Time taken for tests:   210.956 seconds
// Complete requests:      30000
// Failed requests:        25583
//    (Connect: 0, Receive: 0, Length: 25583, Exceptions: 0)
// Keep-Alive requests:    30000
// Total transferred:      7902493 bytes
// HTML transferred:       852493 bytes
// Requests per second:    142.21 [#/sec] (mean)
// Time per request:       1406.374 [ms] (mean)
// Time per request:       7.032 [ms] (mean, across all concurrent requests)
// Transfer rate:          36.58 [Kbytes/sec] received

// Connection Times (ms)
//               min  mean[+/-sd] median   max
// Connect:        0    0   1.2      0      24
// Processing:    43 1398 546.5   1307    4685
// Waiting:       19 1398 546.5   1307    4685
// Total:         43 1398 546.5   1307    4685

// Percentage of the requests served within a certain time (ms)
//   50%   1307
//   66%   1577
//   75%   1705
//   80%   1809
//   90%   2113
//   95%   2393
//   98%   2697
//   99%   2987
//  100%   4685 (longest request)