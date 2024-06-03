import * as NODE from "./node"

export { transformClass }

function transformClassMethod(node: NODE.Node) {
    for (let i: int = 0; i < node.child.length; i += 1) {
        if (node.child[i].value == "struct") {
            let j: int = 0
            while (j < node.child[i].child.length) {
                if (node.child[i].child[j].value == "func") {
                    let method: NODE.Node = node.child[i].child[j]
                    node.child[i].child.remove(j, 1)
                    let methodName: string = node.child[i].child[0].value
                    methodName += "_"
                    methodName += method.child[0].value
                    method.child[0].value = methodName
                    let instance: NODE.Node = NODE.New("param")
                    method.child.insert(1, instance)
                    let instance_this: NODE.Node = NODE.New("this")
                    instance.child.insert(0, instance_this)
                    let instance_type: NODE.Node = NODE.New("struct")
                    instance.child.insert(1, instance_type)
                    let instance_struct: NODE.Node = NODE.New(node.child[i].child[0].value)
                    instance_type.child.insert(0, instance_struct)
                    node.child.insert(i + 1, method)
                } else {
                    j += 1
                }
            }
        }
    }
}

function transformClassCall(node: NODE.Node) {
    if (node.value == "call" && node.child[0].value == "get") {
        let methodName: string = node.child[0].child[0].typeNode.child[0].value
        methodName += "_"
        methodName += node.child[0].child[1].value
        let methodNameNode: NODE.Node = NODE.New(methodName)
        node.child.insert(1, methodNameNode)
        node.child.insert(2, node.child[0].child[0])
        node.child.remove(0, 1)
    }
    for (let i: int = 0; i < node.child.length; i += 1) {
        transformClassCall(node.child[i])
    }
}

function transformClass(node: NODE.Node): NODE.Node {
    transformClassCall(node)
    transformClassMethod(node)
    return node
}
