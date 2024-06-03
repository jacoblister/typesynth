import * as TOKEN from "./token"
import * as NODE from "./node"
import * as PARSER from "./parser"

export { parseComment }

function parseComment(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (token[start].value == "//") {
        let node: NODE.Node = NODE.fromTokens("comment", token, start, end)
        node.child.push(NODE.fromTokens("comment", token, start, end))
        return PARSER.match(start, end, node)
    }
    return PARSER.noMatch()
}
