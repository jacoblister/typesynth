import * as TOKEN from "./token"
import * as NODE from "./node"
import * as PARSER from "./parser"
import * as PARSE_BLOCK from "./parse_block"
import * as PARSE_CLASS from "./parse_class"
import * as PARSE_COMMENT from "./parse_comment"
import * as PARSE_EXPR from "./parse_expr"
import * as PARSE_FUNCTION from "./parse_function"
import * as PARSE_LET from "./parse_let"
import * as PARSE_MODULE from "./parse_module"
import * as PARSE_SET from "./parse_set"
import * as PARSE_TYPE from "./parse_type"

export { fromTokens }

function getTemplates(): PARSER.Template[] {
    let templates: PARSER.Template[] = <PARSER.Template[]>[]
    PARSER.reg(templates, "while", PARSE_BLOCK.parseWhile)
    PARSER.reg(templates, "for", PARSE_BLOCK.parseFor)
    PARSER.reg(templates, "forIn", PARSE_BLOCK.parseForIn)
    PARSER.reg(templates, "if", PARSE_BLOCK.parseIf)
    PARSER.reg(templates, "root", PARSE_BLOCK.parseRoot)
    PARSER.reg(templates, "block", PARSE_BLOCK.parseBlock)

    PARSER.reg(templates, "class", PARSE_CLASS.parseClass)
    PARSER.reg(templates, "classBlock", PARSE_CLASS.parseClassBlock)
    PARSER.reg(templates, "new", PARSE_CLASS.parseNew)

    PARSER.reg(templates, "comment", PARSE_COMMENT.parseComment)

    PARSER.reg(templates, "single", PARSE_EXPR.parseSingle)
    PARSER.reg(templates, "ternaryOp", PARSE_EXPR.parseTernaryOp)
    PARSER.reg(templates, "binaryOp", PARSE_EXPR.parseBinaryOp)
    PARSER.reg(templates, "unaryOp", PARSE_EXPR.parseUnaryOp)
    PARSER.reg(templates, "call", PARSE_EXPR.parseFunctionCall)
    PARSER.reg(templates, "get", PARSE_EXPR.parseGet)
    PARSER.reg(templates, "parentheses", PARSE_EXPR.parseParentheses)
    PARSER.reg(templates, "expr", PARSE_EXPR.parseExpr)

    PARSER.reg(templates, "return", PARSE_FUNCTION.parseReturn)
    PARSER.reg(templates, "functionBody", PARSE_FUNCTION.parseFunctionBody)
    PARSER.reg(templates, "function", PARSE_FUNCTION.parseFunction)
    PARSER.reg(templates, "lambdaFunction", PARSE_FUNCTION.parseLambdaFunction)
    PARSER.reg(templates, "classFunction", PARSE_FUNCTION.parseClassFunction)

    PARSER.reg(templates, "alloc", PARSE_LET.parseAlloc)
    PARSER.reg(templates, "allocArray", PARSE_LET.parseAllocArray)
    PARSER.reg(templates, "letAlloc", PARSE_LET.parseLetAlloc)
    PARSER.reg(templates, "let", PARSE_LET.parseLet)
    PARSER.reg(templates, "paramLet", PARSE_LET.parseParamLet)
    PARSER.reg(templates, "classLet", PARSE_LET.parseClassLet)

    PARSER.reg(templates, "import", PARSE_MODULE.parseImport)
    PARSER.reg(templates, "export", PARSE_MODULE.parseExport)

    PARSER.reg(templates, "assign", PARSE_SET.parseAssign)
    PARSER.reg(templates, "set", PARSE_SET.parseSet)

    PARSER.reg(templates, "mapBody", PARSE_TYPE.parseMapBody)
    PARSER.reg(templates, "type", PARSE_TYPE.parseType)

    return templates
}

function fromTokens(token: TOKEN.Token[]): NODE.Node {
    let templates: PARSER.Template[] = getTemplates()
    let parseResult: PARSER.Result = PARSER.parseWithError(templates, <string[]>["root"], token, 0, token.length - 1)

    return parseResult.node
}
