import * as TOKEN from "./token"
import * as NODE from "./node"
import * as PARSER from "./parser"

export { parseMapBody, parseType }

function parseMapBody(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[start].value != "[") {
        return PARSER.noMatch()
    }
    let node: NODE.Node = NODE.fromTokens("map", token, start, end)
    let parseKeyType: PARSER.Result = PARSER.parseWithError(context, <string[]>["type"], token, start + 3, end + 3)
    node.child.push(parseKeyType.node)

    let parseValueType: PARSER.Result = PARSER.parseWithError(context, <string[]>["type"], token, start + 6, end)
    node.child.push(parseValueType.node)

    return PARSER.match(start, end ,node)
}

function parseType(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[end - 1].value == "[" && token[end].value == "]") {
        let node: NODE.Node = NODE.fromTokens("arr", token, start, end)
        let parseResultType: PARSER.Result = PARSER.parseWithError(context, <string[]>["type"], token, start, end - 2)
        node.child.push(parseResultType.node)
        return PARSER.match(start, end, node)
    }
    let firstToken: string = token[start].value
    if (firstToken == "int" || firstToken == "float" || firstToken == "string" || firstToken == "bool") {
        if (firstToken == "string") {
            firstToken = "str"
        }
        if (firstToken == "bool") {
            firstToken = "int"
        }
        let node: NODE.Node = NODE.fromTokens(firstToken, token, start, end)
        return PARSER.match(start, end, node)
    }
    if (token[start].value == "{" && token[end].value == "}") {
        let parseResult: PARSER.Result = PARSER.parseWithError(context, <string[]>["mapBody", "functionBody"], token, start + 1, end - 1)
        return PARSER.match(start, end, parseResult.node)
    }
    let node: NODE.Node = NODE.fromTokens("struct", token, start, end)
    let parseResult: PARSER.Result = PARSER.parse(context, <string[]>["get"], token, start, end)
    node.child.push(parseResult.match ? parseResult.node : NODE.fromTokens(firstToken, token, start, start))
    return PARSER.match(start, end, node)
}
