import * as SYS from "./sys"
import * as TOKEN from "./token"
import * as COMPILER from "./compiler"
import * as NODE from "./node"

function help(): string {
    let lines = <string[]>[
        "usage: \n\n",
        "  wax <command> [arguments]\n\n",
        "commands: \n\n",
        "  build <--target=wax|--target=js|--target=js-typed|--target=ts|--target=cpp|--target=c> <filename.wax>\n",
        "  fmt <filename.wax>\n"]
    let help: string = ""
    for (let i: int = 0; i < lines.length; i = i + 1) {
        help = help + lines[i]
    }
    return help
}

function main(args: string[]): int {
    if (args.length < 3) {
        console.log(help())
        return 1
    }

    if (args.length == 3 && args[1] == "token") {
        let filename: string = args[2]
        let prog: string = SYS.fileRead(filename)

        let tokens: TOKEN.Token[] = TOKEN.parse(prog, filename, 0)

        for (let i: int = 0; i < tokens.length; i = i + 1) {
            console.log(tokens[i].value)
        }
        return 0
    }
    if (args.length == 4 && args[1] == "build") {
        let node: NODE.Node = COMPILER.load(args[3], args[2])
        let out: string = COMPILER.compile(node, args[2])
        console.log(out)
        return 0
    }
    // if (((args.length == 3) && (args[1] == "fmt"))) {
    //     let node = load(args[2], "--target=wax")
    //     console.log(nodeToWaxPreserveFormat(node))
    //     return 0
    // }
    // console.log(help())
    return 0
}