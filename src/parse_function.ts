import * as TOKEN from "./token"
import * as NODE from "./node"
import * as PARSER from "./parser"

export { parseReturn, parseFunctionBody, parseFunction, parseLambdaFunction, parseClassFunction }

function parseReturn(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[start].value == "return") {
        let node: NODE.Node = NODE.fromTokens("return", token, start, end)
        if (end > start) {
            let parseResultRight: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, start + 1, end)
            node.child.push(parseResultRight.node)
        }
        return PARSER.match(start, end, node)
    }
    return PARSER.noMatch()
}

function parseFunctionBody(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    let paramStartIndex: int = start
    let returnTypeIndexStart: int = 0
    let returnTypeIndexEnd: int = 0
    if (token[paramStartIndex].value != "(") {
        return PARSER.noMatch()
    }
    let paramEndIndex: int = PARSER.matchBlock(token, paramStartIndex, "(", ")")
    let blockStartIndex: int = paramEndIndex + 1
    if (token[blockStartIndex].value == ":") {
        returnTypeIndexStart = paramEndIndex + 2
        returnTypeIndexEnd = paramEndIndex + 2
        while (token[returnTypeIndexEnd + 1].value != "{" && token[returnTypeIndexEnd + 1].value != "}") {
            returnTypeIndexEnd = returnTypeIndexEnd + 1
        }
        blockStartIndex = returnTypeIndexEnd + 1
    }
    let blockEndIndex: int = 0
    if (token[blockStartIndex].value == "{") {
        blockEndIndex = PARSER.matchBlock(token, blockStartIndex, "{", "}")
    } else {
        blockStartIndex = 0
    }
    let node: NODE.Node = NODE.fromTokens("func", token, start, end)
    let argStart: int = paramStartIndex + 1
    let argEnd: int = paramStartIndex + 1
    while (argEnd != paramEndIndex) {
        if (token[argEnd + 1].value == ")" || (token[argEnd + 1].value == ",")) {
            let templates: string[] = <string[]>["paramLet"]
            let parseResultArg: PARSER.Result = PARSER.parseWithError(context, templates, token, argStart, argEnd)
            node.child.push(parseResultArg.node)
            argStart = argEnd + 2
        }
        argEnd = argEnd + 1
        if (token[argEnd].value == "(") {
            argEnd = PARSER.matchBlock(token, argEnd, "(", ")")
        }
    }
    if (returnTypeIndexStart) {
        let parseResult: PARSER.Result = PARSER.parseWithError(context, <string[]>["type"], token, returnTypeIndexStart, returnTypeIndexEnd)
        let resultNode: NODE.Node = NODE.fromTokens("result", token, returnTypeIndexStart, returnTypeIndexEnd)
        resultNode.child.push(parseResult.node)
        node.child.push(resultNode)
    }
    if (blockStartIndex) {
        let index: int = blockStartIndex + 1
        while (index <= blockEndIndex - 1) {
            let parseResult: PARSER.Result = PARSER.parseWithError(context, <string[]>["block"], token, index, blockEndIndex - 1)
            node.child.push(parseResult.node)
            index = parseResult.end + 1
        }
    }
    return PARSER.match(start, blockEndIndex, node)
}

function parseFunction(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[start].value != "function" || token[start + 1].value == "(") {
        return PARSER.noMatch()
    }
    let functionNameIndex: int = start + 1
    let parseResult: PARSER.Result = PARSER.parseWithError(context, <string[]>["functionBody"], token, functionNameIndex + 1, end)
    if (!parseResult.match) {
        return PARSER.noMatch()
    }
    let node: NODE.Node = parseResult.node
    node.child.insert(0, NODE.fromTokens(token[functionNameIndex].value, token, functionNameIndex, functionNameIndex))
    return PARSER.match(start, parseResult.end, node)
}

function parseLambdaFunction(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[start].value != "function" || token[start + 1].value != "(") {
        return PARSER.noMatch()
    }
    let parseResult: PARSER.Result = PARSER.parseWithError(context, <string[]>["functionBody"], token, start + 1, end)
    if (!parseResult.match) {
        return PARSER.noMatch()
    }
    let node: NODE.Node = parseResult.node
    return PARSER.match(start, parseResult.end, node)
}

function parseClassFunction(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    let parseResult: PARSER.Result = PARSER.parseWithError(context, <string[]>["functionBody"], token, start + 1, end)
    if (!parseResult.match) {
        return PARSER.noMatch()
    }
    let node: NODE.Node = parseResult.node
    node.child.insert(0, NODE.fromTokens(token[start].value, token, start, start))
    return PARSER.match(start, parseResult.end, node)
}