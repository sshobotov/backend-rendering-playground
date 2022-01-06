export function replicate(seq, num) {
  const size = seq.length

  var result = []
  for (let i = 0; i < num; i++) {
    result = result.concat(seq)
  }
  return result
}