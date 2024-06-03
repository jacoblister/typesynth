import * as TOKEN from "./token"
import * as NODE from "./node"
import * as PARSER from "./parser"

export { parseClass, parseClassBlock, parseNew }

function parseClass(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (end - start >= 3 && token[start].value == "class" && token[start + 2].value == "{") {
        let endIndex: int = PARSER.matchBlock(token, start + 2, "{", "}")
        let node: NODE.Node = NODE.fromTokens("struct", token, start, end)
        node.child.insert(0, NODE.fromTokens(token[start + 1].value, token, start + 1, start + 1))
        let index: int = start + 3
        while (index <= endIndex - 1) {
            let parseResult: PARSER.Result = PARSER.parseWithError(context, <string[]>["classBlock"], token, index, endIndex - 1)
            node.child.insert(node.child.length, parseResult.node)
            index = parseResult.end + 1
        }
        return PARSER.match(start, endIndex, node)
    }
    return PARSER.noMatch()
}

function parseClassBlock(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    let templates: string[] = <string[]>["comment", "classLet", "classFunction"]
    end = PARSER.matchNewline(token, start, end)
    return PARSER.parseWithError(context, templates, token, start, end)
}

function parseNew(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[start].value == "new") {
        let typeIndexStart: int = start + 1
        let typeIndexEnd: int = start + 1
        let parenIndex: int = 0
        while (typeIndexEnd < end) {
            if (token[typeIndexEnd].value == "(") {
                parenIndex = typeIndexEnd
                typeIndexEnd = typeIndexEnd - 1
                break
            }
            typeIndexEnd +=  1
        }
        let node: NODE.Node = NODE.fromTokens("alloc", token, start, start)
        let parseResultType: PARSER.Result = PARSER.parseWithError(context, <string[]>["type"], token, typeIndexStart, typeIndexEnd)
        let structNode: NODE.Node = parseResultType.node
        node.child.push(structNode)
        let endIndex: int = typeIndexEnd
        if (parenIndex) {
            endIndex = PARSER.matchBlock(token, parenIndex, "(", ")")
            let argStart: int = parenIndex + 1
            let argEnd: int = parenIndex + 1
            while (argEnd != endIndex) {
                if (token[argEnd + 1].value == ")" || token[argEnd + 1].value == ",") {
                    let parseResultArg: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, argStart, argEnd)
                    node.child.push(parseResultArg.node)
                    argStart = argEnd + 2
                }
                argEnd += 1
                if (token[argEnd].value == "(") {
                    argEnd = PARSER.matchBlock(token, argEnd, "(", ")")
                }
            }
        }
        return PARSER.match(start, endIndex, node)
    }
    return PARSER.noMatch()
}

