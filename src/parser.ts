import * as SYS from "./sys"
import * as TOKEN from "./token"
import * as NODE from "./node"

export {
    Result, match, noMatch,
    Template, reg, 
    parseError, matchDelimiter, matchBlock, matchBlockReverse, matchCommaSep, matchNewline,
    parse, parseWithError, 
}

function parseError(node: NODE.Node, message: string) {
    console.log("parse error:")
    console.log(message)
    console.log(node.tokenStart.file.name)
    console.log(node.tokenStart.lineNumber)
    SYS.exit(-1)
}

function matchDelimiter(token: TOKEN.Token[], start: int, delimiter: string): int {
    let index: int = start
    while (index < token.length) {
        if (token[index].value == delimiter) {
            return index
        }
        index += 1
    }
    let node: NODE.Node = NODE.New("error")
    node.tokenStart = token[0]
    parseError(node, "delimiter match fail")
    return 0
}

function matchBlock(token: TOKEN.Token[], start: int, begin: string, end: string): int {
    let nestCount: int = 0
    let index: int = start
    while (index < token.length) {
        if (token[index].value == begin) {
            nestCount = nestCount + 1
        }
        if (token[index].value == end) {
            nestCount = nestCount - 1
            if (nestCount == 0) {
                return index
            }
        }
        index += 1
    }
    let node: NODE.Node = NODE.New("error")
    node.tokenStart = token[0]
    parseError(node, "bracket match fail")
    return 0
}

function matchBlockReverse(token: TOKEN.Token[], start: int, begin: string, end: string): int {
    let nestCount: int = 0
    let index: int = start
    while (index > 0) {
        if (token[index].value == end) {
            nestCount = nestCount + 1
        }
        if (token[index].value == begin) {
            nestCount = nestCount - 1
            if (nestCount == 0) {
                return index
            }
        }
        index = index - 1
    }
    let node: NODE.Node = NODE.New("error")
    node.tokenStart = token[0]
    parseError(node, "bracket match fail")
    return 0
}

function matchCommaSep(token: TOKEN.Token[], start: int, end: int, index: int): int {
    while (index < end) {
        if (token[index].value == "(") {
            index = matchBlock(token, index, "(", ")")
        }
        if (token[index].value == "<") {
            index = matchBlock(token, index, "<", ">")
        }
        if (token[index].value == "[") {
            index = matchBlock(token, index, "[", "]")
        }
        if (index + 1 == end || token[index + 1].value == ",") {
            return index
        }
        index = index + 1
    }
    return 0
}

function matchNewline(token: TOKEN.Token[], start: int, end: int): int {
    let index: int = start
    while (index < token.length - 1) {
        if (index >= end || token[index + 1].newlines > 0) {
            break
        }
        index += 1
    }
    return index
}

class Result {
    match: int
    start: int
    end: int
    node: NODE.Node
}

function match(start: int, end: int, node: NODE.Node): Result {
    let parseResult: Result = new Result()
    parseResult.match = 1
    parseResult.start = start
    parseResult.end = end
    parseResult.node = node
    return parseResult
}

function noMatch(): Result {
    let parseResult: Result = new Result()
    parseResult.match = 0
    parseResult.start = 0
    parseResult.end = 0
    parseResult.node = NODE.New("nomatch")
    return parseResult
}

class Template {
    name: string
    parse: { (context: Template[], token: TOKEN.Token[], start: int, end: int): Result }
}

function reg(templates: Template[], name: string, parse: { (context: Template[], token: TOKEN.Token[], start: int, end: int): Result }) {
    let parseTemplate: Template = new Template()
    parseTemplate.name = name
    parseTemplate.parse = parse
    templates.push(parseTemplate)
}

// function newTemplate(name: string, parse: { (context: Template[], token: TOKEN.Token[], start: int, end: int): Result }): Template {
//     let parseTemplate: Template = new Template()
//     parseTemplate.name = name
//     parseTemplate.parse = parse
//     return parseTemplate
// }

function getTemplate(templates: Template[], name: string): Template {
    for (let i: int = 0; i < templates.length; i += 1) {
        if (templates[i].name == name) {
            return templates[i]
        }
    }

    console.log("parse template not found")
    console.log(name)
    SYS.exit(-1)
    
    return new Template()
}

function parse(context: Template[], templates: string[], token: TOKEN.Token[], start: int, end: int): Result {
    // let msg: string
    // for (let i: int = 0; i < templates.length; i += 1) {
    //     msg += templates[i]+ " "
    // }
    // console.log(msg)

    for (let i: int = 0; i < templates.length; i += 1) {
        let parseTemplate: Template = getTemplate(context, templates[i])
        let match: Result = parseTemplate.parse(context, token, start, end)
        if (match.match) {
            return match
        }
    }
    return noMatch()
}

function parseWithError(context: Template[], templates: string[], token: TOKEN.Token[], start: int, end: int): Result {
    let res: Result = parse(context, templates, token, start, end)
    if (!res.match) {
        let node: NODE.Node = res.node
        node.tokenStart = token[start]
        parseError(node, "no template match")
    }
    return res
}