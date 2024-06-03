import * as TOKEN from "./token"
import * as NODE from "./node"
import * as PARSER from "./parser"

export { parseImport, parseExport }

function parseImport(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (end - start >= 5 && token[start].value == "import") {
        let node: NODE.Node = NODE.fromTokens("import", token, start, end)
        node.child.push(NODE.fromTokens(token[start + 3].value, token, start + 3, start + 3))
        node.child.push(NODE.fromTokens(token[start + 5].value, token, start + 5, start + 5))
        return PARSER.match(start, end, node)
    }
    if (token[start].value == "import" && token[start + 1].value == "\"./global\"") {
        let node: NODE.Node = NODE.fromTokens("comment", token, start, end)
        node.child.push(NODE.fromTokens("comment", token, start, end))
        return PARSER.match(start, end, node)
    }
    return PARSER.noMatch()
}

function parseExport(context: PARSER.Template[], token: TOKEN.Token[], start: int, end: int): PARSER.Result {
    if (end - start >= 2 && token[start].value == "export" && token[start + 1].value == "{") {
        let endIndex: int = PARSER.matchBlock(token, start + 1, "{", "}")
        let node: NODE.Node = NODE.fromTokens("export", token, start, end)
        let exportIndex: int = start + 2
        while (exportIndex < endIndex) {
            if (token[exportIndex].value != ",") {
                node.child.push(NODE.fromTokens(token[exportIndex].value, token, start, end))
            }
            exportIndex = exportIndex + 1
        }
        return PARSER.match(start, endIndex, node)
    }
    return PARSER.noMatch()
}
