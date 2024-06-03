import * as NODE from "./node"

export { transformModule }

function strToUpper(value: string): string {
    // let output: string = ""
    // for (let i: int = 0; i < value.length; i += 1) {
    //   output += (value[i] & 223)
    // }
    // return output
    return value
}

function transformModuleAlt(node: NODE.Node): NODE.Node {
    for (let i: int = 0; i < node.child.length; i += 1) {
        if (node.child[i].value == "module") {
            let moduleNode: NODE.Node = node.child[i]
            for (let j: int = 0; j < moduleNode.child.length; j += 1) {
                if (moduleNode.child[j].value == "alt") {
                    let altNode: NODE.Node = moduleNode.child[j]
                    node.child[i] = altNode
                }
            }
        }
    }
    return node
}

function transformModuleCallFuncNested(module: NODE.Node, node: NODE.Node) {
    if (node.value == "call" && node.child[0].value != "get") {
        let modNode: NODE.Node = NODE.New(module.child[0].value)
        let funcNode: NODE.Node = NODE.New(node.child[0].value)
        node.child[0].child.push(modNode)
        node.child[0].child.push(funcNode)
        node.child[0].value = "get"
        modNode.typeNode = module.typeNode
        funcNode.typeNode = node.typeNode
        node.child[0].typeNode = node.typeNode
    }
    for (let i: int = 0; i < node.child.length; i += 1) {
        transformModuleCallFuncNested(module, node.child[i])
    }
}

function transformModuleCallFunc(node: NODE.Node) {
    for (let i: int = 0; i < node.child.length; i += 1) {
        if (node.child[i].value == "module") {
            transformModuleCallFuncNested(node.child[i], node.child[i])
        }
    }
}

function transformModuleSymbolNested(name: string, depth: int, node: NODE.Node) {
    if ((node.value == "func" && depth <= 1) || (node.value == "struct" && NODE.getType(node.child[0]) == NODE.NODE_TYPE_STR)) {
        let symbolName: string = strToUpper(name)
        symbolName += "_"
        symbolName += node.child[0].value
        node.child[0].value = symbolName
    }
    for (let i: int = 0; i < node.child.length; i += 1) {
        transformModuleSymbolNested(name, (depth + 1), node.child[i])
    }
}

function transformModuleSymbolLetRename(node: NODE.Node, from: string, to: string) {
    if (node.value == from) {
        node.value = to
    }
    for (let i: int = 0; i < node.child.length; i += 1) {
        transformModuleSymbolLetRename(node.child[i], from, to)
    }
}

function transformModuleSymbolLet(module: string, node: NODE.Node) {
    for (let i: int = 0; i < node.child.length; i += 1) {
        if (node.child[i].value == "let") {
            let symbolName: string = strToUpper(module)
            symbolName += "_"
            symbolName += node.child[i].child[0].value
            transformModuleSymbolLetRename(node, node.child[i].child[0].value, symbolName)
        }
    }
}

function transformModuleSymbol(node: NODE.Node): NODE.Node {
    for (let i: int = 0; i < node.child.length; i += 1) {
        if (node.child[i].value == "module") {
            transformModuleSymbolNested(node.child[i].child[0].value, 0, node.child[i])
            transformModuleSymbolLet(node.child[i].child[0].value, node.child[i])
            while (node.child[i].child.length > 1) {
                let moveNode: NODE.Node = node.child[i].child[(node.child[i].child.length - 1)]
                if (!(moveNode.value == "export" || moveNode.value == "alt")) {
                    node.child.insert(i + 1, moveNode)
                }
                node.child[i].child.remove(node.child[i].child.length - 1, 1)
            }
            node.child.remove(i, 1)
        }
    }
    return node
}

function transformModuleRef(node: NODE.Node) {
    if (node.value == "get" && node.child[0].typeNode.value == "module") {
        let symbolName: string = strToUpper(node.child[0].value)
        symbolName += "_"
        symbolName += node.child[1].value
        node.value = symbolName
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    for (let i: int = 0; i < node.child.length; i += 1) {
        transformModuleRef(node.child[i])
    }
}

function transformModule(node: NODE.Node): NODE.Node {
    transformModuleAlt(node)
    transformModuleCallFunc(node)
    transformModuleSymbol(node)
    transformModuleRef(node)
    return node
}
