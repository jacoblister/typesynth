import * as TOKEN from "./token"
import * as NODE from "./node"
import * as PARSER from "./parser"

export { parseSingle, parseTernaryOp, parseBinaryOp, parseUnaryOp, parseFunctionCall, parseGet, parseParentheses, parseExpr }

function parseSingle(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[start].value == "(") {
        return PARSER.noMatch()
    }
    if (start == end) {
        let node: NODE.Node = NODE.fromTokens(token[start].value, token, start, end)
        return PARSER.match(start, end, node)
    }
    return PARSER.noMatch()
}

function parseTernaryOp(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    let opIfIndex: int = start
    let opElseIndex: int = start
    let i: int = start
    while (i < end) {
        if (token[i].value == "(") {
            i = PARSER.matchBlock(token, i, "(", ")")
        }
        if (token[i].value == "[") {
            i = PARSER.matchBlock(token, i, "[", "]")
        }
        if (token[i].value == "?") {
            opIfIndex = i
        }
        if (token[i].value == ":") {
            opElseIndex = i
        }
        i += 1
    }
    if (opIfIndex == start || opElseIndex == start || opIfIndex > opElseIndex) {
        return PARSER.noMatch()
    }
    let node: NODE.Node = NODE.fromTokens("?", token, start, end)
    let parseResultIf: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, start, opIfIndex - 1)
    node.child.push(parseResultIf.node)
    let parseResultThen: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, opIfIndex + 1, opElseIndex - 1)
    node.child.push(parseResultThen.node)
    let parseResultElse: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, opElseIndex + 1, end)
    node.child.push(parseResultElse.node)
    return PARSER.match(start, end, node)
}

function parseBinaryOp(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    let operators: string[] = <string[]>["||", "&&", "|", "^", "&", "==", "!=", "<", "<=", ">", ">=", "<<", ">>", "+", "-", "*", "/", "%"]
    let operatorLevel: int[] = <int[]>[3, 4, 5, 6, 7, 8, 8, 9, 9, 9, 9, 10, 10, 11, 11, 12, 12, 12]
    let opMatch: int = 0
    let opIndex: int = 0
    let opLevel: int = 100
    let i: int = start
    while (i < end) {
        if (token[i].value == "(") {
            i = PARSER.matchBlock(token, i, "(", ")")
        }
        if (token[i].value == "[") {
            i = PARSER.matchBlock(token, i, "[", "]")
        }
        for (let j: int = 0; j < operators.length; j += 1) {
            let level: int = operatorLevel[j]
            if (token[i].value == operators[j] && level <= opLevel && i > start && (!opMatch || i > opIndex + 1)) {
                opMatch = 1
                opIndex = i
                opLevel = level
            }
        }
        i += 1
    }
    if (opIndex == 0) {
        return PARSER.noMatch()
    }
    let op: string = token[opIndex].value
    if (op == "==") {
        op = "="
    }
    if (op == "!=") {
        op = "<>"
    }
    let node: NODE.Node = NODE.fromTokens(op, token, start, end)
    let parseResultLeft: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, start, opIndex - 1)
    node.child.push(parseResultLeft.node)
    let parseResultRight: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, opIndex + 1, end)
    node.child.push(parseResultRight.node)
    return PARSER.match(start, end, node)
}

function parseUnaryOp(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    let op: string = token[start].value
    if (!(op == "!" || op == "+" || op == "-")) {
        return PARSER.noMatch()
    }
    
    let node: NODE.Node = NODE.fromTokens(op, token, start, end)
    let parseResult: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, start + 1, end)
    node.child.push(parseResult.node)
    
    return PARSER.match(start, end, node)
}

function parseFunctionCall(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (start == end || token[start].value == "(" || token[end].value != ")") {
        return PARSER.noMatch()
    }
    let bracketStartIndex: int = PARSER.matchBlockReverse(token, end, "(", ")")
    let bracketEndIndex: int = PARSER.matchBlock(token, bracketStartIndex, "(", ")")
    let node: NODE.Node = NODE.fromTokens("call", token, start, bracketEndIndex)
    let parseResultLeft: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, start, bracketStartIndex - 1)
    node.child.push(parseResultLeft.node)
    let argStart: int = bracketStartIndex + 1
    let argEnd: int = PARSER.matchCommaSep(token, bracketStartIndex, bracketEndIndex, argStart)
    while (argEnd) {
        let parseResultArg: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, argStart, argEnd)
        node.child.push(parseResultArg.node)
        argStart = argEnd + 2
        argEnd = PARSER.matchCommaSep(token, bracketStartIndex, bracketEndIndex, argStart)
    }
    return PARSER.match(start, bracketEndIndex, node)
}

function parseGet(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    let indexStart: int = 0
    let indexEnd: int = end
    for (let i: int = start; i <= end; i += 1) {
        if (token[i].value == "(") {
            i = PARSER.matchBlock(token, i, "(", ")")
        }
        if (token[i].value == ".") {
            indexStart = i
            indexEnd = end
        }
        if (token[i].value == "[") {
            indexStart = i
            i = PARSER.matchBlock(token, indexStart, "[", "]")
            indexEnd = i - 1
        }
    }
    if (indexStart == 0) {
        return PARSER.noMatch()
    }
    let node: NODE.Node = NODE.fromTokens("get", token, start, end)
    let parseResultLeft: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, start, indexStart - 1)
    node.child.push(parseResultLeft.node)
    let parseResultRight: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, indexStart + 1, indexEnd)
    node.child.push(parseResultRight.node)
    if (parseResultRight.node.value == "length") {
        node.value = "#"
        node.child.remove(1, 1)
    }
    return PARSER.match(start, end, node)
}

function parseParentheses(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[start].value == "(") {
        end = PARSER.matchBlock(token, start, "(", ")")
        let parseResultExpr: PARSER.Result = PARSER.parseWithError(context, <string[]>["expr"], token, start + 1, end - 1)
        if (parseResultExpr.match) {
            return PARSER.match(start, end, parseResultExpr.node)
        }
    }
    return PARSER.noMatch()
}

function parseExpr(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    let templates: string[] = <string[]>["single", "alloc", "new", "lambdaFunction", "ternaryOp", "binaryOp", "unaryOp", "call", "get", "parentheses"]
    return PARSER.parseWithError(context, templates, token, start, end)
}
