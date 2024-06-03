import * as TOKEN from "./token"
import * as NODE from "./node"
import * as PARSER from "./parser"

export { parseWhile, parseFor, parseForIn, parseIf, parseRoot, parseBlock }

function parseBrackets(context: PARSER.Template[], blockName: string, token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[start].value == "{") {
        end = PARSER.matchBlock(token, start, "{", "}")
        let node: NODE.Node = NODE.fromTokens(blockName, token, start, end)
        let index: int = start + 1
        while (index <= end - 1) {
            let parseResult: PARSER.Result = PARSER.parseWithError(context, <string[]>["block"], token, index, end - 1)
            node.child.push(parseResult.node)
            index = parseResult.end + 1
        }
        return PARSER.match(start, end, node)
    }
    let parseResult: PARSER.Result = PARSER.parse(context, <string[]>["block"], token, start, end)
    if (parseResult.match) {
        let node: NODE.Node = NODE.fromTokens(blockName, token, start, end)
        node.child.push(parseResult.node)
        return PARSER.match(parseResult.start, parseResult.end, node)
    }
    return PARSER.noMatch()
}

function parseWhile(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[start].value != "while") {
        return PARSER.noMatch()
    }
    let parseResultCondition: PARSER.Result = PARSER.parse(context, <string[]>["parentheses"], token, start + 1, end)
    if (!parseResultCondition.match) {
        return PARSER.noMatch()
    }
    let parseResultBlock: PARSER.Result = parseBrackets(context, "do", token, parseResultCondition.end + 1, end)
    if (!parseResultBlock.match) {
        return PARSER.noMatch()
    }
    
    let node: NODE.Node = NODE.fromTokens("while", token, start, parseResultBlock.end)
    node.child.push(parseResultCondition.node)
    node.child.push(parseResultBlock.node)
    
    return PARSER.match(start, parseResultBlock.end, node)
}

function parseFor(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[start].value != "for") {
        return PARSER.noMatch()
    }
    let parenStartIndex: int = (start + 1)
    if (token[parenStartIndex].value != "(") {
        return PARSER.noMatch()
    }
    let parenEndIndex: int = PARSER.matchBlock(token, parenStartIndex, "(", ")")
    let forInitIndex: int = PARSER.matchDelimiter(token, parenStartIndex + 1, ";")
    let parseResultInit: PARSER.Result = PARSER.parse(context, <string[]>["let"], token, parenStartIndex + 1, forInitIndex - 1)
    if (!parseResultInit.match) {
        return PARSER.noMatch()
    }
    let forConditionIndex: int = PARSER.matchDelimiter(token, (forInitIndex + 1), ";")
    let parseResultCondition: PARSER.Result = PARSER.parse(context, <string[]>["expr"], token, forInitIndex + 1, forConditionIndex - 1)
    if (!parseResultCondition.match) {
        return PARSER.noMatch()
    }
    let parseResultUpdate: PARSER.Result = PARSER.parse(context, <string[]>["set"], token, forConditionIndex + 1, parenEndIndex - 1)
    if (!parseResultUpdate.match) {
        return PARSER.noMatch()
    }
    let parseResultBlock: PARSER.Result = parseBrackets(context, "do", token, (parenEndIndex + 1), end)
    if (!parseResultBlock.match) {
        return PARSER.noMatch()
    }
    let node: NODE.Node = NODE.fromTokens("for", token, start, parseResultBlock.end)
    node.child.push(parseResultInit.node)
    node.child.push(parseResultCondition.node)
    node.child.push(parseResultUpdate.node)
    node.child.push(parseResultBlock.node)
    return PARSER.match(start, parseResultBlock.end, node)
}

function parseForIn(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[start].value != "for") {
        return PARSER.noMatch()
    }
    let parenStartIndex: int = (start + 1)
    if (token[parenStartIndex].value != "(") {
        return PARSER.noMatch()
    }

    if (token[start + 4].value != "in") {
        return PARSER.noMatch()
    }

    let parenEndIndex: int = PARSER.matchBlock(token, parenStartIndex, "(", ")")

    let parseResultIn: PARSER.Result = parseBrackets(context, "expr", token, start + 5, parenEndIndex - 1)
    if (!parseResultIn.match) {
        return PARSER.noMatch()
    }

    let parseResultBlock: PARSER.Result = parseBrackets(context, "do", token, (parenEndIndex + 1), end)
    if (!parseResultBlock.match) {
        return PARSER.noMatch()
    }
    let node: NODE.Node = NODE.fromTokens("for", token, start, parseResultBlock.end)
    node.child.push(NODE.fromTokens(token[start + 3].value, token, start + 3, start + 3))
    node.child.push(parseResultIn.node)
    node.child.push(parseResultBlock.node)
    return PARSER.match(start, parseResultBlock.end, node)
}

function parseIf(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[start].value != "if") {
        return PARSER.noMatch()
    }
    let parseResultCondition: PARSER.Result = PARSER.parse(context, <string[]>["parentheses"], token, start + 1, end)
    if (!parseResultCondition.match) {
        return PARSER.noMatch()
    }
    let parseResultIfBlock: PARSER.Result = parseBrackets(context, "then", token, parseResultCondition.end + 1, end)
    if (!parseResultIfBlock.match) {
        return PARSER.noMatch()
    }
    let endIndex: int = parseResultIfBlock.end
    let node: NODE.Node = NODE.fromTokens("if", token, start, parseResultIfBlock.end)
    node.child.push(parseResultCondition.node)
    node.child.push(parseResultIfBlock.node)
    let parseResultElseBlock: PARSER.Result = PARSER.noMatch()
    if (parseResultIfBlock.end < end && token[parseResultIfBlock.end + 1].value == "else") {
        parseResultElseBlock = parseBrackets(context, "else", token, parseResultIfBlock.end + 2, end)
        if (parseResultElseBlock.match) {
            node.child.push(parseResultElseBlock.node)
            endIndex = parseResultElseBlock.end
        }
    }
    return PARSER.match(start, endIndex, node)
}

function parseBlock(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    let templatesBlock: string[] = <string[]>["class", "export", "function", "new", "while", "forIn", "for", "if"]
    let parseResult: PARSER.Result = PARSER.parse(context, templatesBlock, token, start, end)
    if (parseResult.match) {
        return parseResult
    }

    let templates: string[] = <string[]>["comment", "import", "letAlloc", "let", "set", "return", "expr"]
    end = PARSER.matchNewline(token, start, end)
    return PARSER.parseWithError(context, templates, token, start, end)
}

function parseRoot(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    let node: NODE.Node = NODE.fromTokens("root", token, start, end)

    let index: int = start
    while (index <= end) {
        let parseResult: PARSER.Result = PARSER.parse(context, <string[]>["block"], token, index, end)
        node.child.push(parseResult.node)
        index = parseResult.end + 1
    }
    return PARSER.match(start, end, node)
}