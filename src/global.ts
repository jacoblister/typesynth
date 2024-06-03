declare global {
    type int = number
    type float = number
    type bool = boolean | number

    interface Array<T> {
        insert(index: int, item: T): Array<T>;
    }
    interface Array<T> {
        remove(index: int, count: int): Array<T>;
    }

    let console: any
    let process: any
    let require: any

    let window: any
    let document: any
    let setTimeout: any
}

Array.prototype.insert = function(index, item) {
    this.splice(index, 0, item)
    return this
}

Array.prototype.remove = function(index, count) {
    this.splice(index, count)
    return this
}

export {}