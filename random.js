// Spaces in the end to increase chances for a space to appear
const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789,.-!?()[]`                '

export function randomNum(minIncl, maxExcl) {
  return Math.floor(Math.random() * (maxExcl - minIncl)) + minIncl
}

export function randomString(minIncl, maxExcl) {
  const charactersNum = characters.length
  const resultSize = randomNum(minIncl, maxExcl)

  var result = ""
  for (let i = 0; i < resultSize; i++) {
    result += characters[randomNum(0, charactersNum)]
  }
  return result
}
