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