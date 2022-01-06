export class AsyncQueue {
  #values = []
  #resolvers = []
  #readFreshValues = false

  constructor(values, readFreshValues) {
    if (Array.isArray(values)) {
      this.#values = values
    }
    this.#readFreshValues = !!readFreshValues
  }

  enqueue(value) {
    if (this.#resolvers.length == 0) {
      this.#values.push(value)
    } else {
      const resolve = this.#resolvers.shift()
      resolve(value)
    }
  }

  async dequeue() {
    if (this.#values.length == 0) {
      return new Promise((resolve) => {
        this.#resolvers.push(resolve)
      })
    } else if (this.#readFreshValues) {
      return this.#values.pop()
    } else {
      return this.#values.shift()
    }
  }

  size() { return this.#values.length }
}

export async function parallel(times, asyncFn) {  
  const promises = new Array(times)
  for (let i = 0; i < times; i++) {
    promises[i] = asyncFn(i)
  }
  return Promise.all(promises)
}

export async function sequence(times, asyncFn) {  
  const results = new Array(times)
  for (let i = 0; i < times; i++) {
    results[i] = await asyncFn(i)
  }
  return results
}
