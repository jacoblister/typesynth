import * as NODE from "./node"

export { transformParse }

function transformParseArray(node: NODE.Node) {
    if (node.value == "get" && node.child[0].typeNode.value == "arr" && node.child[1].value == "length") {
        node.value = "#"
        node.child.remove(1, 1)
    }
    if (node.value == "call" && node.child[0].value == "get" && node.child[0].child[0].typeNode.value == "arr") {
        node.value = node.child[0].child[1].value
        node.child[0] = node.child[0].child[0]
    }
    for (let i: int = 0; i < node.child.length; i += 1) {
        transformParseArray(node.child[i])
    }
}

function transformParseComment(node: NODE.Node) {
    for (let i: int = node.child.length - 1; i >= 0; i += -1) {
        if (NODE.getType(node.child[i]) == NODE.NODE_TYPE_EXPR && node.child[i].value == "comment") {
            node.child.remove(i, 1)
        } else {
            transformParseComment(node.child[i])
        }
    }
}

function transformParseBlockEmpty(node: NODE.Node) {
    for (let i: int = (node.child.length - 1); i >= 0; i += -1) {
        if ((node.child[i].value == "then" || node.child[i].value == "else" || node.child[i].value == "do") && node.child[i].child.length == 0) {
            let nodeEmpty: NODE.Node = NODE.New("")
            nodeEmpty.tokenStart = node.child[i].tokenStart
            nodeEmpty.tokenEnd = node.child[i].tokenEnd
            node.child[i].child.insert(0, nodeEmpty)
        } else {
            transformParseBlockEmpty(node.child[i])
        }
    }
}

function transformParseCastString(node: NODE.Node) {
    if (node.value == "call" && node.child[0].value == "String") {
        node.value = "cast"
        node.child.remove(0, 1)
        let nodeStr: NODE.Node = NODE.New("str")
        node.child.push(nodeStr)
    }
    for (let i: int = 0; i < node.child.length; i += 1) {
        transformParseCastString(node.child[i])
    }
}

function transformParseConsoleLog(node: NODE.Node) {
    if (node.value == "call" && node.child[0].value == "get" && node.child[0].child[0].value == "console" && node.child[0].child[1].value == "log") {
        node.value = "print"
        node.child.remove(0, 1)
    }
    for (let i: int = 0; i < node.child.length; i += 1) {
        transformParseConsoleLog(node.child[i])
    }
}

function transformParse(node: NODE.Node): NODE.Node {
    transformParseArray(node)
    transformParseComment(node)
    transformParseBlockEmpty(node)
    transformParseCastString(node)
    transformParseConsoleLog(node)
    return node
}
