import * as TOKEN from "./token"
import * as NODE from "./node"
import * as PARSER from "./parser"

export { parseAssign, parseSet }

function parseAssign(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    let index: int = 0
    for (let i: int = start + 1; i < end; i += 1) {
        if (token[i].value == "+=") {
            index = i
            break
        }
    }
    if (index == 0) {
        return PARSER.noMatch()
    }
    let node: NODE.Node = NODE.fromTokens("set", token, start, end)
    let parseResultLeft: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, start, index - 1)
    node.child.push(parseResultLeft.node)
    let parseResultRight: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, index + 1, end)
    let nodeAssign: NODE.Node = NODE.fromTokens("+", token, start, end)
    nodeAssign.child.push(parseResultLeft.node)
    nodeAssign.child.push(parseResultRight.node)
    node.child.push(nodeAssign)
    return PARSER.match(start, parseResultRight.end, node)
}

function parseSet(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    let parseResultAssign: PARSER.Result = PARSER.parse(context, <string[]>["assign"], token, start, end)
    if (parseResultAssign.match) {
        return parseResultAssign
    }
    let index: int = 0
    for (let i: int = start + 1; i < end; i += 1) {
        if (token[i].value == "=") {
            index = i
            break
        }
    }
    if (index == 0) {
        return PARSER.noMatch()
    }
    let node: NODE.Node = NODE.fromTokens("set", token, start, end)
    let parseResultLeft: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, start, index - 1)
    node.child.push(parseResultLeft.node)
    let parseResultRight: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, index + 1, end)

    node.child.push(parseResultRight.node)
    return PARSER.match(start, parseResultRight.end, node)
}
