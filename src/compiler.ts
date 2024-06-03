import * as SYS from "./sys"
import * as TOKEN from "./token"
import * as NODE from "./node"
import * as PARSE from "./parse"
import * as SYMBOL from "./symbol"
import * as TRANSFORM from "./transform"
import * as TARGET from "./target"

export { load, compile }

function strUnquote(quote: string): string {
    let value: string = ""
    for (let i: int = 1; i < quote.length - 1; i += 1) {
        value += quote[i]
    }
    return value
}

function parseSource(source: string, filename: string, altExt: string): NODE.Node {
    let node: NODE.Node
    let S: string = "s"
    if (filename[filename.length - 1] == S[0]) {
        let tokens: TOKEN.Token[] = TOKEN.parseJs(source, filename, 0)
        node = PARSE.fromTokens(tokens)
    } else {
        let tokens: TOKEN.Token[] = TOKEN.parse(source, filename, 0)
        node = NODE.parse(tokens)
    }
    return node
}

function getBasePath(path: string): string {
    let index: int = path.length
    let result: string = ""
    while (index > 0) {
        if (path[index] == "/"[0]) {
            break
        }
        index = index - 1
    }

    for (let i: int = 0; i <= index; i = i + 1) {
        result += path[i]
    }
    return result
}

function loadImports(node: NODE.Node, path: string, altExt: string): NODE.Node[] {
    let modules: NODE.Node[] = <NODE.Node[]>[]
    let i: int = 0
    while (i < node.child.length) {
        if (node.child[i].value == "import") {
            let importName: string = strUnquote(node.child[i].child[1].value)
            let basePath: string = path + getBasePath(importName)
            let filename: string = path + importName + ".ts"

            let source: string = SYS.fileRead(filename)
            let nodeModule: NODE.Node = parseSource(source, filename, altExt)
            nodeModule.value = "module"
            nodeModule.child.insert(0, node.child[i].child[0])
            if (nodeModule.child[0].value == "SYS" || nodeModule.child[0].value == "NATIVE") {
                let altFileName: string = filename + altExt
                if (SYS.fileExists(altFileName)) {
                    let altModule: string = SYS.fileRead(altFileName)
                    let altNode: NODE.Node = NODE.New("alt")
                    altNode.child.insert(0, NODE.New(altModule))
                    nodeModule.child.insert(1, altNode)
                }
            }
            let childModules: NODE.Node[] = loadImports(nodeModule, basePath, altExt)
            for (let j: int = 0; j < childModules.length; j += 1) {
                modules.insert(modules.length, childModules[j])
            }
            modules.push(nodeModule)
            node.child.remove(i, 1)
        } else {
            i += 1
        }
    }
    return modules
}

function replaceImports(node: NODE.Node, altExt: string): NODE.Node {
    let modules: NODE.Node[] = loadImports(node, "", altExt)
    let i: int = 0
    while (i < modules.length) {
        let j: int = 0
        while (j < modules.length) {
            if (j != i && modules[i].child[0].value == modules[j].child[0].value) {
                modules.remove(j, 1)
            } else {
                j += 1
            }
        }
        i += 1
    }
    for (let i: int = 0; i < modules.length; i += 1) {
        node.child.insert(i, modules[i])
    }
    return node
}

function load(filename: string, target: string): NODE.Node {
    let altExt: string = ".none"
    if (target == "--target=cpp") {
        altExt = ".cpp"
    }
    if (target == "--target=c") {
        altExt = ".c"
    }
    let source: string = SYS.fileRead(filename)
    let root: NODE.Node = parseSource(source, filename, altExt)
    let S: string = "s"
    if (filename[filename.length - 1] == S[0]) {
        root = replaceImports(root, altExt)
    }
    return root
}

function compile(root: NODE.Node, target: string): string {
    if (target == "--target=wax-raw") {
        return NODE.toWax(root)
    }
    root = SYMBOL.setTypes(root)
    root = TRANSFORM.transformParse(root)
    if (target == "--target=wax") {
        return NODE.toWax(root)
    }
    if (target == "--target=waxmod") {
        //        root = transformModule(root)
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
    // if (target == "--target=py") {
    //     root = transformModule(root)
    //     return nodeToPy(root)
    // }
    if (target == "--target=cpp") {
        return TARGET.cpp(root)
    }
    if (target == "--target=cpp-noref") {
        return TARGET.cppNoRef(root)
    }
    if (target == "--target=c") {
        root = TRANSFORM.transformModule(root)
        root = TRANSFORM.transformClass(root)
        root = TRANSFORM.transformArray(root)
        return TARGET.c(root)
    }
    return "no target"
}