import * as TOKEN from "./token"

export {
    Node, New, fromTokens, parse, expand, copy, getType, indentNeeded,
    toWax, toWaxDebug,
    NODE_TYPE_EXPR,
    NODE_TYPE_PREPROCESS,
    NODE_TYPE_CHAR,
    NODE_TYPE_STR,
    NODE_TYPE_STR_QUOTE,
    NODE_TYPE_INT,
    NODE_TYPE_FLOAT,
    NODE_TYPE_COMMENT,
    NODE_FLAG_STRUCT_MEMBER,
    NODE_FLAG_CONSTRUCTOR,
    NODE_FLAG_NO_BRACKETS,
    NODE_FLAG_NO_REF,
}

let NODE_TYPE_EXPR: int = 0
let NODE_TYPE_PREPROCESS: int = 1
let NODE_TYPE_CHAR: int = 2
let NODE_TYPE_STR: int = 3
let NODE_TYPE_STR_QUOTE: int = 4
let NODE_TYPE_INT: int = 5
let NODE_TYPE_FLOAT: int = 6
let NODE_TYPE_COMMENT: int = 7
let NODE_FLAG_STRUCT_MEMBER: int = 1
let NODE_FLAG_CONSTRUCTOR: int = 2
let NODE_FLAG_NO_BRACKETS: int = 3
let NODE_FLAG_NO_REF: int = 4

class Node {
    value: string
    child: Node[]
    tokenStart: TOKEN.Token
    tokenEnd: TOKEN.Token
    flags: int
    typeNode: Node

    constructor(value: string, tokenStart: TOKEN.Token, tokenEnd: TOKEN.Token) {
        this.value = value
        this.child = <Node[]>[]
        this.tokenStart = tokenStart
        this.tokenEnd = tokenEnd
        this.flags = 0
    }
}

function New(value: string): Node {
    let tokenFile = new TOKEN.TokenFile("")
    let t = new TOKEN.Token("", tokenFile, 0, 0)

    let node = new Node(value, t, t)
    return node
}

function fromTokens(value: string, tokens: TOKEN.Token[], tokenStart: int, tokenEnd: int): Node {
    let node = new Node(value, tokens[tokenStart], tokens[tokenEnd])
    return node
}

function copy(src: Node): Node {
    let res = new Node(src.value, src.tokenStart, src.tokenEnd)
    for (let i: int = 0; i < src.child.length; i += 1) {
        res.child.push(copy(src.child[i]))
    }
    res.flags = src.flags
    res.typeNode = src.typeNode
    return res
}

let NODE_CHAR_DOUBLE_QUOTE: string = "\""
let NODE_CHAR_SINGLE_QUOTE: string = "'"
let NODE_CHAR_MINUS: string = "-"
let NODE_CHAR_DECIMAL: string = "."
let NODE_CHAR_ZERO: string = "0"
let NODE_CHAR_NINE: string = "9"
let NODE_CHAR_AT: string = "@"

function typeFromTokenMatch(token: string, i: int, test: string): bool {
    return token[i] == test[0]
}

function typeFromTokenBetween(token: string, i: int, from: string, to: string): bool {
    return token[i] >= from[0] && token[i] <= to[0]
}

function typeFromToken(token: string): int {
    if (token.length > 0) {
        if (typeFromTokenMatch(token, 0, NODE_CHAR_AT)) {
            return NODE_TYPE_PREPROCESS
        }
        if (typeFromTokenMatch(token, 0, NODE_CHAR_SINGLE_QUOTE)) {
            return NODE_TYPE_CHAR
        }
        if (typeFromTokenMatch(token, 0, NODE_CHAR_DOUBLE_QUOTE)) {
            return NODE_TYPE_STR_QUOTE
        }
        if (typeFromTokenBetween(token, 0, NODE_CHAR_ZERO, NODE_CHAR_NINE) ||
            typeFromTokenMatch(token, 0, NODE_CHAR_MINUS)) {
            for (let i: int = 0; i < token.length; i += 1) {
                if (typeFromTokenMatch(token, i, NODE_CHAR_DECIMAL)) {
                    return NODE_TYPE_FLOAT
                }
            }
            return NODE_TYPE_INT
        }
    }
    return NODE_TYPE_STR
}

function getType(node: Node): int {
    if (node.child.length || node.value == "break" || node.value == "return" || node.value == "arr" || node.value == "map") {
        return NODE_TYPE_EXPR
    }
    return typeFromToken(node.value)
}

function parse(tokens: TOKEN.Token[]): Node {
    let stack = <Node[]>[]
    stack.push(New("root"))
    let i: int = 0
    while (i < tokens.length) {
        let token: string = tokens[i].value
        if (token == "(") {
            let value: string = ""
            let next_token: string = tokens[i + 1].value
            if (next_token != "(" && next_token != ")") {
                value = next_token
            }
            let node: Node = New(value)
            node.tokenStart = tokens[i]
            if (value != "") {
                i += 1
            }
            let parent: Node = stack[stack.length - 1]
            parent.child.push(node)
            stack.push(node)
        } else {
            if (token == ")") {
                stack.remove(stack.length - 1, 1)
            } else {
                let child: Node = New(token)
                child.tokenStart = tokens[i]
                let node: Node = stack[stack.length - 1]
                node.child.push(child)
            }
        }
        i += 1
    }
    return stack[0]
}

function expand(nodeOrg: Node): Node {
    if (nodeOrg.child.length < 2) {
        return nodeOrg
    }
    let expanded: Node = New(nodeOrg.value)
    expanded.child.push(nodeOrg.child[0])
    if (nodeOrg.child.length == 2) {
        expanded.child.push(nodeOrg.child[1])
    } else {
        let expandedChild: Node = New(nodeOrg.value)
        for (let i: int = 1; i < nodeOrg.child.length; i +=  1) {
            expandedChild.child.push(nodeOrg.child[i])
        }
        expanded.child.push(expandedChild)
    }
    return expanded
}

function indentNeeded(node: Node, child: Node): int {
    if (getType(child) != NODE_TYPE_EXPR) {
        return 0
    }
    if (child.value == "param" || child.value == "result") {
        return 0
    }
    if (node.value == "" || node.value == "root" || node.value == "func" ||
        node.value == "do" || node.value == "then" || node.value == "else" ||
        node.value == "struct" || node.value == "module") {
        return 1
    }
    return 0
}

function nodeToStrType(node: Node): string {
    if (node.typeNode) {
        let res: string = "."
        res += node.typeNode.value
        if (node.typeNode.value == "struct") {
            res += ":"
            res += node.typeNode.child[0].value
        }
        return res
    }
    return ""
}

function nodeToStr(nodeToWaxNewlines: int, nodeToWaxTypes: int, depth: int, node: Node): string {
    let s: string = ""
    depth += 1
    if (node.value == "root") {
        for (let i: int = 0; i < node.child.length; i += 1) {
            let child: string = nodeToStr(nodeToWaxNewlines, nodeToWaxTypes, depth, node.child[i])
            let newlines: int = i == 0 ? 0 : 1
            if (nodeToWaxNewlines) {
                newlines = node.child[i].tokenStart.newlines
            }
            for (let j: int = 0; j < newlines; j += 1) {
                s += "\n"
            }
            s += child
        }
        return s
    }
    if (getType(node) == NODE_TYPE_EXPR) {
        if (node.value != "root") {
            s += "("
            s += node.value
        }
        for (let i: int = 0; i < node.child.length; i += 1) {
            let nodeChild: Node = node.child[i]
            let isIndentNeeded: bool = 0
            let newlines: int = 1
            if (nodeToWaxNewlines) {
                isIndentNeeded = nodeChild.tokenStart.newlines > 0
                newlines = nodeChild.tokenStart.newlines
            } else {
                isIndentNeeded = indentNeeded(node, nodeChild)
            }
            let indentDepth: int = isIndentNeeded ? depth : depth - 1
            let indent: string = "\t"
            if (node.value == "root" && i == 0) {
                isIndentNeeded = 1
                newlines = 0
            }
            if (isIndentNeeded) {
                for (let i: int = 0; i < newlines; i += 1) {
                    s += "\n"
                }
                for (let i: int = 0; i < indentDepth - 1; i += 1) {
                    s += indent
                }
            } else {
                s += " "
            }
            let child: string = nodeToStr(nodeToWaxNewlines, nodeToWaxTypes, indentDepth, nodeChild)
            s += child
            if (isIndentNeeded && i == node.child.length - 1 && node.value != "root") {
                s += "\n"
                for (let i: int = 0; i < indentDepth - 2; i += 1) {
                    s += indent
                }
            }
        }
        if (node.value != "root") {
            s += ")"
        }
    } else {
        s += node.value
    }
    if (nodeToWaxTypes) {
        s += nodeToStrType(node)
    }
    return s
}

function toWax(node: Node): string {
    return nodeToStr(0, 0, 0, node)
}

function toWaxPreserveFormat(node: Node): string {
    return nodeToStr(1, 0, 0, node)
}

function toWaxDebug(node: Node): string {
    return nodeToStr(0, 1, 0, node)
}

