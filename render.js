// Default setup:
//  - default paddings, margins, thikness etc.
//  - text max width 600px
//  - font family OpenSans
export function measureHeightsWithDefaultSetup(texts) {
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
