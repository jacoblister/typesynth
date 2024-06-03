import "./global"
import * as SYS from "./sys"
import * as TOKEN from "./token"
import * as NODE from "./node"
import * as SYMBOL from "./symbol"
import * as TARGET from "./target"

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

function load(filename: string, target: string): NODE.Node {
    let source: string = SYS.readFile(filename)

    let tokens: TOKEN.Token[] = TOKEN.parse(source, filename, 0)
    let root: NODE.Node = NODE.parse(tokens)

    return root
}

function compile(root: NODE.Node, target: string): string {
    if (target == "--target=wax-raw") {
        return NODE.toWax(root)
    }
    root = SYMBOL.setTypes(root)
    if (target == "--target=wax") {
        return NODE.toWax(root)
    }
    if (target == "--target=wax-debug") {
        return NODE.toWaxDebug(root)
    }
    if (target == "--target=js") {
        return TARGET.js(root)
    }
    if (target == "--target=ts") {
        return TARGET.ts(root)
    }
    if (target == "--target=cpp") {
        return TARGET.cpp(root)
    }
    if (target == "--target=c") {
        //   root = transformModule(root)
        //   root = transformClass(root)
        //   root = transformArray(root)
        return TARGET.c(root)
    }
    return "no target"
}

function main(args: string[]): int {
    if (args.length < 3) {
        console.log(help())
        return 1
    }

    if (args.length == 3 && args[1] == "token") {
        let filename: string = args[2]
        let prog: string = SYS.readFile(filename)

        let tokens: TOKEN.Token[] = TOKEN.parse(prog, filename, 0)

        for (let i: int = 0; i < tokens.length; i = i + 1) {
            console.log(tokens[i].value)
        }
        return 0
    }
    if (args.length == 4 && args[1] == "build") {
        let node: NODE.Node = load(args[3], args[2])
        let out: string = compile(node, args[2])
        console.log(out)
        return 0
    }
    return 0
}