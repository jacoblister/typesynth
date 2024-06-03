import "./global"

export { fileExists, fileRead, args, exit, execmain }

function fileExists(filename: string): int {
    let fs: any = require('fs')

    return fs.existsSync(filename)
}

function fileRead(filename: string): string {
    let fs: any = require('fs')

    if (!fs.existsSync(filename)) {
        console.log("Error opening file: " + filename)
        process.exit(0)
    }
    
    return fs.readFileSync(filename).toString()
}

function args(): string[] {
    return process.argv.slice(1)
}

function exit(result: int) {
    process.exit(result)
}

function execmain(main: any) {
    exit(main(args()))
}