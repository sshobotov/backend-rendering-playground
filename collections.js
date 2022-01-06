export function replicate(seq, num) {
  const size = seq.length

  var result = []
  for (let i = 0; i < num; i++) {
    result = result.concat(seq)
  }
  return result
}

export class CircularPool {
  #items = []
  #size = 0
  #curr = 0

  constructor(items) {
    this.#items = items
    this.#size = items.length
  }

  get() {
    let item = this.#items[this.#curr]
    this.#curr = (this.#curr + 1) % this.#size

    return item
  }
}