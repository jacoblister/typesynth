import * as NODE from "./node"

export { nodeToJs, nodeToTs }

function nodeToJsTypeTs(node: NODE.Node): string {
    if (node.value == "struct") {
        return node.child[0].value
    }
    if (node.value == "arr") {
        return nodeToJsTypeTs(node.child[0]) + "[]"
    }
    if (node.value == "map") {
        return "{[key: " + nodeToJsTypeTs(node.child[0]) + "]: " + nodeToJsTypeTs(node.child[1]) + "}"
    }
    if (node.value == "str") {
        return "string"
    }
    return node.value
}

function nodeToJsTypeJs(node: NODE.Node): string {
    if (node.value == "struct") {
        return node.child[0].value
    }
    if (node.value == "arr") {
        let type: string = "[" + nodeToJsTypeTs(node.child[0]) + "]"
        return type
    }
    if (node.value == "str") {
        return "string"
    }
    return node.value
}

function nodeToJsNode(tsTypes: int, depth: int, node: NODE.Node): string {
    let s: string = ""
    depth += 1
    node = NODE.copy(node)
    if (NODE.getType(node) != NODE.NODE_TYPE_EXPR) {
        let value: string = node.value
        if (NODE.getType(node) == NODE.NODE_TYPE_PREPROCESS) {
            value = ""
            for (let i: int = 1; i < node.value.length; i += 1) {
                value += node.value[i]
            }
        }
        if (NODE.getType(node) == NODE.NODE_TYPE_COMMENT) {
            value = "// "
            value += node.value
        }
        s += value
        return s
    }
    let blockStart: string = ""
    let blockEnd: string = ""
    let blockSeperator: string = " "
    if (node.value == "root") {
        blockStart = "Array.prototype.insert = function(index, item) {\n"
        blockStart += "  this.splice(index, 0, item)\n"
        blockStart += "  return this\n"
        blockStart += "}\n"
        blockStart += "Array.prototype.remove = function(index, count) {\n"
        blockStart += "  this.splice(index, count)\n"
        blockStart += "  return this\n"
        blockStart += "}\n"
        blockEnd = ""
        let hasMain: int = 0
        for (let i: int = 0; i < node.child.length; i += 1) {
            if (node.child[i].value == "func" && node.child[i].child[0].value == "main") {
                hasMain = 1
            }
        }
        if (hasMain) {
            blockEnd += "(typeof process == 'undefined') ? main([]) : process.exit(main(process.argv.slice(1)));\n"
        }
    }
    if (node.value == "+" || node.value == "&&" || node.value == "||") {
        node = NODE.expand(node)
    }
    if (node.value == "") {
        blockStart = "{"
        blockEnd = "}"
    }
    if (node.value == "@define") {
        blockStart = "const " + node.child[0].value + " = " + node.child[1].value
        blockEnd = ""
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "@if") {
        if (node.child[0].value == "TARGET_JS") {
            node.child.remove(0, 1)
            node.child.remove(0, 1)
        } else {
            while (node.child.length > 0) {
                node.child.remove(0, 1)
            }
        }
    }
    if (node.value == "extern") {
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "asm") {
        let quotedline: string = node.child[0].value
        let line: string = ""
        for (let j: int = 1; j < quotedline.length - 1; j += 1) {
            line += quotedline[j]
        }
        blockStart = line
        blockEnd = "\n"
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "module") {
        let altValue: string = ""
        for (let i: int = 0; i < node.child.length; i += 1) {
            if (node.child[i].value == "alt") {
                altValue = node.child[i].child[0].value
            }
        }
        if (altValue.length > 0) {
            blockStart = altValue
            blockEnd = ""
            while (node.child.length > 0) {
                node.child.remove(0, 1)
            }
        } else {
            blockStart = "let " + node.child[0].value + " = {};\n" + "(function(module) {"
            blockEnd = ""
            for (let i: int = 0; i < node.child.length; i += 1) {
                if (node.child[i].value == "export") {
                    for (let j: int = 0; j < node.child[i].child.length; j += 1) {
                        blockEnd += "  module." + node.child[i].child[j].value + " = " + node.child[i].child[j].value + "\n"
                    }
                    node.child.remove(i, 1)
                }
            }
            blockEnd += "})(" + node.child[0].value + ");"
            node.child.remove(0, 1)
        }
    }
    if (node.value == "struct") {
        for (let i: int = 1; i < node.child.length; i += 1) {
            if (node.child[i].value == "let" || node.child[i].value == "func") {
                node.child[i].flags = (node.child[i].flags | NODE.NODE_FLAG_STRUCT_MEMBER)
            }
        }
        blockStart = "class " + node.child[0].value + " {"
        blockEnd = "}"
        node.child.remove(0, 1)
    }
    if (node.value == "func") {
        let lastChild: NODE.Node = node.child[node.child.length - 1]
        if (lastChild.value == "param" || lastChild.value == "result" || NODE.getType(lastChild) == NODE.NODE_TYPE_STR) {
            while (node.child.length > 0) {
                node.child.remove(0, 1)
            }
        } else {
            blockStart = "function "
            if (node.flags & NODE.NODE_FLAG_STRUCT_MEMBER) {
                blockStart = ""
            }
            if (NODE.getType(node.child[0]) == NODE.NODE_TYPE_STR) {
                let fnameNode: NODE.Node = node.child[0]
                blockStart += fnameNode.value
                node.child.remove(0, 1)
            }
            blockStart += "("
            let resultNode: NODE.Node
            let paramCount: int = 0
            let i: int = 0
            while (i < node.child.length) {
                let childNode: NODE.Node = node.child[i]
                if (childNode.value == "param") {
                    if (childNode.child.length == 2) {
                        let paramNode: NODE.Node = childNode.child[0]
                        if (paramCount > 0) {
                            blockStart += ", "
                        }
                        blockStart += paramNode.value
                        if (tsTypes) {
                            blockStart += ": "
                            blockStart += nodeToJsTypeTs(childNode.child[1])
                        }
                        paramCount = (paramCount + 1)
                    }
                    node.child.remove(i, 1)
                    i = i - 1
                }
                if (childNode.value == "result") {
                    resultNode = childNode
                    node.child.remove(i, 1)
                    i = i - 1
                }
                i += 1
            }
            blockStart += ")"
            if (tsTypes) {
                if (resultNode) {
                    blockStart += ": " + nodeToJsTypeTs(resultNode.child[0])
                }
            }
            blockStart += " {"
            blockEnd = "}"
        }
    }
    if (node.value == "call") {
        blockStart = nodeToJsNode(tsTypes, depth, node.child[0]) + "("
        blockEnd = ")"
        node.child.remove(0, 1)
        blockSeperator = ", "
    }
    if (node.value == "let" || node.value == "local") {
        blockStart = "let "
        if (node.flags & NODE.NODE_FLAG_STRUCT_MEMBER) {
            blockStart = ""
        }
        blockEnd = ""
        blockStart += node.child[0].value
        if (node.child.length == 3) {
            if (tsTypes) {
                blockStart += ": " + nodeToJsTypeTs(node.child[1])
            }
            blockStart += " = " + nodeToJsNode(tsTypes, depth, node.child[2])
        } else {
            if (tsTypes) {
                blockStart += ": " + nodeToJsTypeTs(node.child[1])
            }
        }
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "alloc") {
        let child: NODE.Node = node.child[0]
        if (NODE.getType(child) == NODE.NODE_TYPE_EXPR) {
            if (node.child[0].value == "vec" && node.child.length == 1) {
                blockStart = "new Array(" + nodeToJsNode(tsTypes, depth, node.child[0].child[0]) + ").fill(0)"
            } else {
                if (node.child[0].value == "arr" || node.child[0].value == "vec") {
                    if (tsTypes && node.child[0].child.length) {
                        blockStart = "<" + nodeToJsTypeTs(node.child[0].typeNode) + ">"
                    }
                    blockStart += "["
                    for (let i: int = 1; i < node.child.length; i += 1) {
                        blockStart += nodeToJsNode(tsTypes, depth, node.child[i])
                        if (i < node.child.length - 1) {
                            blockStart += ", "
                        }
                    }
                    blockStart += "]"
                }
            }
            if (node.child[0].value == "map") {
                if (tsTypes && node.child[0].child.length) {
                    blockStart = "<" + nodeToJsTypeTs(node.child[0].typeNode) + ">"
                }
                blockStart += "{"
                for (let i: int = 1; i < node.child.length; i += 2) {
                    blockStart += nodeToJsNode(tsTypes, depth, node.child[i]) + ": "
                    blockStart += nodeToJsNode(tsTypes, depth, node.child[i + 1])
                    if (i < node.child.length - 2) {
                        blockStart += ", "
                    }
                }
                blockStart += "}"
            }
            if (node.child[0].value == "struct") {
                blockStart = "new " + nodeToJsNode(tsTypes, depth, node.child[0].child[0]) + "("
                for (let i: int = 1; i < node.child.length; i += 1) {
                    blockStart += nodeToJsNode(tsTypes, depth, node.child[i])
                    if (i < node.child.length - 1) {
                        blockStart += ", "
                    }
                }
                blockStart += ")"
            }
        }
        if (NODE.getType(child) == NODE.NODE_TYPE_STR) {
            if (node.child.length >= 2) {
                blockStart = nodeToJsNode(tsTypes, depth, node.child[1])
            } else {
                blockStart = "\"\""
            }
        }
        while (node.child.length > 0) {
            node.child.remove(node.child.length - 1, 1)
        }
    }
    if (node.value == "free") {
        blockStart = "/*GC*/"
        blockEnd = ""
        node.child.remove(0, 1)
    }
    if (node.value == "#") {
        blockEnd = ".length"
    }
    if (node.value == "insert") {
        blockStart = nodeToJsNode(tsTypes, depth, node.child[0]) + ".insert(" + nodeToJsNode(tsTypes, depth, node.child[1]) + "," + nodeToJsNode(tsTypes, depth, node.child[2])
        blockEnd = ")"
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "remove") {
        if (NODE.getType(node.child[1]) != NODE.NODE_TYPE_STR_QUOTE) {
            blockStart = nodeToJsNode(tsTypes, depth, node.child[0]) + ".remove(" + nodeToJsNode(tsTypes, depth, node.child[1]) + ", " + nodeToJsNode(tsTypes, depth, node.child[2])
            blockEnd = ")"
        }
        if (NODE.getType(node.child[1]) == NODE.NODE_TYPE_STR_QUOTE) {
            blockStart = "delete " + nodeToJsNode(tsTypes, depth, node.child[0]) + "[" + nodeToJsNode(tsTypes, depth, node.child[1])
            blockEnd = "]"
        }
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "slice") {
        blockStart = nodeToJsNode(tsTypes, depth, node.child[0]) + ".slice(" + nodeToJsNode(tsTypes, depth, node.child[1]) + ",(" + nodeToJsNode(tsTypes, depth, node.child[2]) + " + " + nodeToJsNode(tsTypes, depth, node.child[1])
        blockEnd = "))"
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "push") {
        blockStart = nodeToJsNode(tsTypes, depth, node.child[0]) + ".push(" + nodeToJsNode(tsTypes, depth, node.child[1])
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
        blockEnd = ")"
    }
    if (node.value == "get") {
        blockStart = nodeToJsNode(tsTypes, depth, node.child[0])
        blockEnd = ""
        for (let i: int = 1; i < node.child.length; i += 1) {
            let type: string = node.child[i - 1].typeNode.value
            let value: string = nodeToJsNode(tsTypes, depth, node.child[i])
            if (type == "arr" || type == "vec" || type == "map" || type == "str") {
                blockEnd += "[" + value + "]"
            } else {
                blockEnd += "." + value + ""
            }
        }
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "set") {
        blockStart = nodeToJsNode(tsTypes, depth, node.child[0])
        blockEnd = ""
        let n: int = (node.child.length - 1)
        for (let i: int = 1; i < n; i += 1) {
            let type: string = node.child[(i - 1)].typeNode.value
            let value: string = nodeToJsNode(tsTypes, depth, node.child[i])
            if (type == "arr" || type == "vec" || type == "map" || type == "str") {
                blockEnd += "[" + value + "]"
            } else {
                blockEnd += "." + value + ""
            }
        }
        blockEnd += " = " + nodeToJsNode(tsTypes, depth, node.child[n])
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "cast") {
        if (node.child[1].value == "str") {
            blockStart = "String(" + nodeToJsNode(tsTypes, depth, node.child[0])
            blockEnd = ")"
        }
        if (node.child[1].value == "int") {
            blockStart = nodeToJsNode(tsTypes, depth, node.child[0])
            blockEnd = "|0"
        }
        node.child.remove(0, 1)
        node.child.remove(0, 1)
    }
    if (node.value == "then") {
        blockStart = "{"
        blockEnd = "}"
    }
    if (node.value == "else") {
        blockStart = "else {"
        blockEnd = "}"
    }
    if (node.value == "for") {
        if (node.child.length == 5) {
            node.child[2].flags = (node.child[2].flags | NODE.NODE_FLAG_NO_BRACKETS)
            blockStart = "for (let " + nodeToJsNode(tsTypes, depth, node.child[0])
            if (tsTypes) {
                blockStart += ": int"
            }
            blockStart += " = " + nodeToJsNode(tsTypes, depth, node.child[1]) + "; "
            blockStart += nodeToJsNode(tsTypes, depth, node.child[2]) + "; "
            blockStart += nodeToJsNode(tsTypes, depth, node.child[0]) + " += " + nodeToJsNode(tsTypes, depth, node.child[3]) + ") "
            node.child.remove(0, 4)
            blockEnd = ""
        }
        if (node.child.length == 4 && node.child[0].child.length > 0) {
            node.child[1].flags = (node.child[1].flags | NODE.NODE_FLAG_NO_BRACKETS)
            blockStart = "for (" + nodeToJsNode(tsTypes, depth, node.child[0]) + "; "
            blockStart += nodeToJsNode(tsTypes, depth, node.child[1]) + "; "
            blockStart += nodeToJsNode(tsTypes, depth, node.child[2]) + ") "
            node.child.remove(0, 3)
            blockEnd = ""
        }
        if (node.child.length == 3) {
            blockStart = "for (let " + nodeToJsNode(tsTypes, depth, node.child[0]) + " in " + nodeToJsNode(tsTypes, depth, node.child[1]) + ") "
            node.child.remove(0, 2)
            blockEnd = ""
        }
    }
    if (node.value == "if" || node.value == "while") {
        blockStart = node.value + " ("
        node.child[0].flags = (node.child[0].flags | NODE.NODE_FLAG_NO_BRACKETS)
        let block: string = nodeToJsNode(tsTypes, depth, node.child[0])
        blockStart += block + ") "
        blockEnd = ""
        node.child.remove(0, 1)
    }
    if (node.value == "do") {
        blockStart = "{"
        blockEnd = "}"
    }
    if (node.value == "break") {
        blockStart = "break"
        blockEnd = ""
    }
    if (node.value == "?") {
        blockStart = "(" + nodeToJsNode(tsTypes, depth, node.child[0]) + " ? " + nodeToJsNode(tsTypes, depth, node.child[1]) + " : " + nodeToJsNode(tsTypes, depth, node.child[2])
        blockEnd = ")"
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "print") {
        blockStart = "console.log("
        blockEnd = ")"
    }
    if (node.value == "!") {
        blockStart = "(!"
        blockEnd = ")"
    }
    if (node.value == ">>" || node.value == "<<" || node.value == "=" || node.value == "&&" || node.value == "||" || node.value == ">=" || node.value == "<=" || node.value == "<>" || node.value == "+" || node.value == "-" || node.value == "*" || node.value == "/" || node.value == "^" || node.value == "%" || node.value == "&" || node.value == "|" || node.value == "~" || node.value == "<" || node.value == ">") {
        if (node.value == "=") {
            node.value = "=="
        }
        if (node.value == "<>") {
            node.value = "!="
        }
        if (!(node.flags & NODE.NODE_FLAG_NO_BRACKETS)) {
            blockStart = "("
            blockEnd = ")"
        }
        if (node.value == "<<" && node.child[0].typeNode.value == "str") {
            blockStart = ""
            blockEnd = ""
            node.value = "+="
        }
        node.child.insert(1, NODE.New(node.value))
    }
    if (node.value == "return") {
        blockStart = "return"
        if (node.child.length > 0) {
            blockStart += " "
        }
        blockEnd = ""
    }
    s += blockStart
    for (let i: int = 0; i < node.child.length; i += 1) {
        let nodeChild: NODE.Node = node.child[i]
        let indentNeeded: int = NODE.indentNeeded(node, nodeChild)
        let indentDepth: int = (indentNeeded ? depth : (depth - 1))
        let indent: string = "  "
        if (indentNeeded) {
            s += "\n"
            for (let i: int = 0; i < (indentDepth - 1); i += 1) {
                s += indent
            }
        } else {
            if (i > 0) {
                s += blockSeperator
            }
        }
        if ((nodeChild.value == "func" || nodeChild.value == "struct" || nodeChild.value == "module") && i > 0) {
            s += "\n"
            for (let i: int = 0; i < (indentDepth - 1); i += 1) {
                s += indent
            }
        }
        let child: string = nodeToJsNode(tsTypes, indentDepth, nodeChild)
        s += child
        if (indentNeeded && i == node.child.length - 1) {
            s += "\n"
            for (let i: int = 0; i < indentDepth - 2; i += 1) {
                s += indent
            }
        }
    }
    s += blockEnd
    return s
}

function nodeToJs(node: NODE.Node): string {
    return nodeToJsNode(0, 0, node)
}

function nodeToTs(node: NODE.Node): string {
    return nodeToJsNode(1, 0, node)
}