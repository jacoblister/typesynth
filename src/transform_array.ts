import * as NODE from "./node"

export { transformArray }

function transformArrayMethods(node: NODE.Node): NODE.Node {
    if (node.value == "push" && node.child.length == 2) {
        node.value = "insert"
        let nodeLength: NODE.Node = NODE.New("#")
        nodeLength.tokenStart = node.tokenStart
        nodeLength.tokenEnd = node.tokenEnd
        nodeLength.child.insert(0, NODE.copy(node.child[0]))
        node.child.insert(1, nodeLength)
    }
    for (let i: int = 0; i < node.child.length; i += 1) {
        transformArrayMethods(node.child[i])
    }
    return node
}


function transformArray(node: NODE.Node): NODE.Node {
    transformArrayMethods(node)
    return node
}
