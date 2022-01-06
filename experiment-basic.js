import p from "puppeteer"

// Very basic experimentation with puppeteer
const text = '<p>Das Haus Wettin ist mit über 1000 Jahren Familiengeschichte eines der ältesten urkundlich nachgewiesenen Geschlechter des deutschen</p>';

(async () => {
  const browser = await p.launch();
  const page = await browser.newPage();
  
  for (let i = 0; i < 5; i++) {
  console.time("test render");
   
  var result = await page.evaluate((text) => {
    function meassure(text) {
      var div = document.createElement("div");
    
      div.style.width = "600px";
      div.style.fontFamily = "OpenSans";
      div.style.fontSize = "14px";
      div.innerHTML = text;
    
      document.body.append(div);

      return div.clientHeight; 
    }

    var arr = [];
    for (let j = 0; j < 100; j++) {
      arr.push(meassure(text));
    }
    return arr;
  }, text + " -- " + i);

  console.timeEnd("test render");
  console.log("Received result " + result);
  }
  await browser.close();
})();
