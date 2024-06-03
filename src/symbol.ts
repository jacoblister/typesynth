import * as NODE from "./node"

export { setTypes }

class NodeSymbol {
    name: string
    node: NODE.Node
}

function dumpSymbol(symbol: NodeSymbol[]): string {
    let s: string = ""
    for (let i: int = 0; i < symbol.length; i += 1) {
        s += " "
        s += symbol[i].name
    }
    return s
}

function nodeSymbolScopeNode(symbol: NodeSymbol[], node: NODE.Node): NodeSymbol[] {
    let copySymbol: NodeSymbol[] = <NodeSymbol[]>[]
    for (let i: int = 0; i < symbol.length; i += 1) {
        let s: NodeSymbol = new NodeSymbol()
        s.name = symbol[i].name
        s.node = symbol[i].node
        copySymbol.insert(copySymbol.length, s)
    }
    if (node.value == "struct" && node.child.length > 1) {
        let s: NodeSymbol = new NodeSymbol()
        s.name = "this"
        s.node = node
        copySymbol.insert(copySymbol.length, s)
    }
    for (let i: int = 0; i < node.child.length; i += 1) {
        let child: NODE.Node = node.child[i]
        if (NODE.getType(child) == NODE.NODE_TYPE_EXPR &&
            ((child.value == "struct" && child.child.length > 1) ||
                child.value == "module" ||
                child.value == "func" ||
                child.value == "let" ||
                child.value == "param" ||
                child.value == "for")) {
            let s: NodeSymbol = new NodeSymbol()
            s.name = child.child[0].value
            s.node = child
            copySymbol.insert(copySymbol.length, s)
        }
    }
    return copySymbol
}

function nodeSymbolGetTypeNode(symbol: NodeSymbol[], type: string, name: string): NODE.Node {
    for (let i: int = symbol.length - 1; i >= 0; i += -1) {
        if (symbol[i].name == name) {
            if (type == "" || type == symbol[i].node.value) {
                if (symbol[i].node.value == "let" || symbol[i].node.value == "param") {
                    if (symbol[i].node.child[1].typeNode) {
                        return symbol[i].node.child[1].typeNode
                    }
                }
                if (symbol[i].node.value == "for") {
                    return NODE.New("int")
                }
                if (symbol[i].node.value != "let") {
                    return symbol[i].node
                }
            }
        }
    }
    return NODE.New("unknown")
}

function nodeSymbolSetTypes(parentSymbol: NodeSymbol[], node: NODE.Node) {
    let symbol: NodeSymbol[] = nodeSymbolScopeNode(parentSymbol, node)
    for (let i: int = 0; i < node.child.length; i += 1) {
        nodeSymbolSetTypes(symbol, node.child[i])
    }
    if (NODE.getType(node) == NODE.NODE_TYPE_INT || NODE.getType(node) == NODE.NODE_TYPE_CHAR) {
        node.typeNode = NODE.New("int")
        return
    }
    if (NODE.getType(node) == NODE.NODE_TYPE_FLOAT) {
        node.typeNode = NODE.New("float")
        return
    }
    if (NODE.getType(node) == NODE.NODE_TYPE_STR_QUOTE) {
        node.typeNode = NODE.New("str")
        return
    }
    if (node.value == "int" || node.value == "float" || node.value == "str") {
        node.typeNode = node
        return
    }
    if (node.value == "&" || node.value == "|") {
        node.typeNode = NODE.New("int")
        return
    }
    if (NODE.getType(node) == NODE.NODE_TYPE_STR) {
        node.typeNode = nodeSymbolGetTypeNode(symbol, "", node.value)
        return
    }
    if (NODE.getType(node) == NODE.NODE_TYPE_PREPROCESS) {
        node.typeNode = NODE.New("int")
    }
    if (node.value == "let" || node.value == "param") {
        node.child[0].typeNode = node.child[1].typeNode
    }
    if (node.value == "cast" || node.value == "?") {
        node.typeNode = node.child[1].typeNode
    }
    if (node.value == "vec" || node.value == "arr" || node.value == "map") {
        node.typeNode = node
    }
    if (node.value == "#") {
        node.typeNode = NODE.New("int")
    }
    if (node.value == "struct" || node.value == "module" || node.value == "alloc") {
        node.typeNode = node.child[0].typeNode
    }
    if (node.value == "get" || node.value == "set") {
        for (let i: int = 0; i < node.child.length - 1; i += 1) {
            let nodeFirst: NODE.Node = node.child[i]
            let nodeNext: NODE.Node = node.child[i + 1]
            if (nodeFirst.typeNode.value == "arr" || nodeFirst.typeNode.value == "vec") {
                nodeNext.typeNode = nodeFirst.typeNode.child[0].typeNode
            }
            if (node.value == "get" && nodeFirst.typeNode.value == "str") {
                node.typeNode = NODE.New("char")
                return
            }
            if (nodeFirst.typeNode.value == "map") {
                nodeNext.typeNode = nodeFirst.typeNode.child[1].typeNode
            }
            if (nodeFirst.typeNode.value == "struct") {
                for (let j: int = 1; j < nodeFirst.typeNode.child.length; j += 1) {
                    if ((nodeFirst.typeNode.child[j].value == "let" || nodeFirst.typeNode.child[j].value == "func") &&
                        nodeFirst.typeNode.child[j].child[0].value == nodeNext.value) {
                        nodeNext.typeNode = nodeFirst.typeNode.child[j].child[0].typeNode
                    }
                }
            }
            if (nodeFirst.typeNode.value == "module") {
                for (let j: int = 1; j < nodeFirst.typeNode.child.length; j += 1) {
                    if ((nodeFirst.typeNode.child[j].value == "struct" || nodeFirst.typeNode.child[j].value == "let" || nodeFirst.typeNode.child[j].value == "func") &&
                        nodeFirst.typeNode.child[j].child[0].value == nodeNext.value) {
                        nodeNext.typeNode = nodeFirst.typeNode.child[j].child[0].typeNode
                    }
                }
            }
        }
        node.typeNode = node.child[node.child.length - 1].typeNode
    }
    if (node.value == "+" || node.value == "-" || node.value == "*" || node.value == "/" || node.value == "<<" || node.value == ">>") {
        node.typeNode = node.child[1].typeNode
    }
    if (node.value == "func") {
        node.typeNode = node
    }
    if (node.value == "call") {
        node.typeNode = NODE.New("unknown")
        let func_node: NODE.Node = node.child[0].typeNode
        for (let i: int = 0; i < func_node.child.length; i += 1) {
            if (func_node.child[i].value == "result") {
                node.typeNode = func_node.child[i].child[0].typeNode
            }
        }

        for (let i: int = 1; i < node.child.length; i += 1) {
            let param: NODE.Node = node.child[i]
            if (param.value == "alloc" && (param.child[0].value == "arr" || param.child[0].value == "map") && param.child[0].child.length == 0) {
                param.typeNode = func_node.child[i].child[1]
                param.child[0].typeNode = func_node.child[i].child[1]
            }
        }
    }
    if (node.value == "let" && node.child.length == 3 && node.child[2].value == "alloc") {
        let alloc: NODE.Node = node.child[2]
        if ((alloc.child[0].value == "arr" || alloc.child[0].value == "map") && alloc.child[0].child.length == 0) {
            alloc.typeNode = node.child[1]
            alloc.child[0].typeNode = node.child[1]
        }
    }
}

function setTypes(node: NODE.Node): NODE.Node {
    let symbol: NodeSymbol[] = <NodeSymbol[]>[]
    nodeSymbolSetTypes(symbol, node)
    return node
}
