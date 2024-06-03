import * as TOKEN from "./token"
import * as NODE from "./node"
import * as PARSER from "./parser"

export { parseAlloc, parseAllocArray, parseLetAlloc, parseLet, parseParamLet, parseClassLet }

function parseAlloc(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    let allocTemplates = <string[]>["allocArray"]

    let parseResultAlloc: PARSER.Result = PARSER.parse(context, allocTemplates, token, start, end)
    if (parseResultAlloc.match) {
        return parseResultAlloc
    }

    if (token[start].value == "<") {
        let bracketStartIndex: int = start
        let bracketEndIndex: int = PARSER.matchBlock(token, bracketStartIndex, "<", ">")
        let parseResultType: PARSER.Result = PARSER.parseWithError(context, <string[]>["type"], token, bracketStartIndex + 1, bracketEndIndex - 1)

        parseResultAlloc = PARSER.parse(context, allocTemplates, token, bracketEndIndex + 1, end)
        if (parseResultAlloc.match) {
            parseResultAlloc.start = start
            parseResultAlloc.node.child[0] = parseResultType.node
            return parseResultAlloc
        }
    }

    return PARSER.noMatch()
}

function parseAllocArray(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[start].value == "[") {
        let allocNode: NODE.Node = NODE.fromTokens("alloc", token, start, end)
        allocNode.child.push(NODE.fromTokens("arr", token, start, end))

        let bracketStartIndex: int  = start
        let bracketEndIndex: int  = PARSER.matchBlock(token, bracketStartIndex, "[", "]")
        let argStart: int = bracketStartIndex + 1
        let argEnd: int = PARSER.matchCommaSep(token, bracketStartIndex, bracketEndIndex, argStart)
        while (argEnd) {
            let parseResultArg: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, argStart, argEnd)
            allocNode.child.push(parseResultArg.node)
            argStart = argEnd + 2
            argEnd = PARSER.matchCommaSep(token, bracketStartIndex, bracketEndIndex, argStart)
        }
        end = bracketEndIndex

        return PARSER.match(start, end, allocNode)
    }
    return PARSER.noMatch()
}

function parseLetAlloc(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[start].value == "let" && token[start + 2].value == "=") {
        let templates: string[] = <string[]>["alloc", "new"]
        let parseResultAlloc: PARSER.Result = PARSER.parse(context, templates, token, start + 3, end)
        if (!parseResultAlloc.match) {
            return PARSER.noMatch()
        }
        end = parseResultAlloc.end
        let node: NODE.Node = NODE.fromTokens("let", token, start, end)
        node.child.push(NODE.fromTokens(token[start + 1].value, token, start + 1, start + 1))
        node.child.push(NODE.copy(parseResultAlloc.node.child[0]))
        node.child.push(parseResultAlloc.node)
        return PARSER.match(start, end, node)
    }
    return PARSER.noMatch()
}

function parseLet(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[start].value == "let" && token[start + 2].value == ":") {
        let assignIndex: int = 0
        for (let i: int = start + 1; i < end; i += 1) {
            if (token[i].value == "=") {
                assignIndex = i
                break
            }
        }
        let endIndex: int = assignIndex ? assignIndex - 1 : end
        let parseResultType: PARSER.Result = PARSER.parseWithError(context, <string[]>["type"], token, start + 3, endIndex)
        let node: NODE.Node = NODE.fromTokens("let", token, start, endIndex)
        node.child.push(NODE.fromTokens(token[start + 1].value, token, start + 1, start + 1))
        node.child.push(parseResultType.node)
        if (assignIndex) {
            let parseResult: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, assignIndex + 1, end)
            node.child.push(parseResult.node)
            end = parseResult.end
        }
        return PARSER.match(start, end, node)
    }
    return PARSER.noMatch()
}

function parseParamLet(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[start + 1].value == ":") {
        let parseResultType: PARSER.Result = PARSER.parseWithError(context, <string[]>["type"], token, start + 2, end)
        let node: NODE.Node = NODE.fromTokens("param", token, start, end)
        node.child.push(NODE.fromTokens(token[start + 0].value, token, start + 1, start + 1))
        node.child.push(parseResultType.node)
        return PARSER.match(start, end, node)
    }
    return PARSER.noMatch()
}

function parseClassLet(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    let indexSeparator: int = 0
    if (token[start + 1].value == ":") {
        indexSeparator = start + 1
    }
    if (token[start + 1].value == "?" && token[start + 2].value == ":") {
        indexSeparator = start + 2
    }
    if (indexSeparator) {
        let parseResultType: PARSER.Result = PARSER.parseWithError(context, <string[]>["type"], token, indexSeparator + 1, end)
        let node: NODE.Node = NODE.fromTokens("let", token, start, end)
        node.child.push(NODE.fromTokens(token[start].value, token, start, start))
        node.child.push(parseResultType.node)
        return PARSER.match(start, end, node)
    }
    return PARSER.noMatch()
}
