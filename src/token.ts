export { Token, TokenFile, parse, parseJs }

let TOKEN_CHAR_TAB: string = "\t"
let TOKEN_CHAR_NL: string = "\n"
let TOKEN_CHAR_CR: string = "\r"
let TOKEN_CHAR_SPACE: string = " "
let TOKEN_EXCLAMATION: string = "!"
let TOKEN_CHAR_ZERO: string = "0"
let TOKEN_CHAR_NINE: string = "9"
let TOKEN_CHAR_UPPER_A: string = "A"
let TOKEN_CHAR_UPPER_F: string = "F"
let TOKEN_CHAR_UPPER_Z: string = "Z"
let TOKEN_CHAR_LOWER_A: string = "a"
let TOKEN_CHAR_LOWER_X: string = "x"
let TOKEN_CHAR_LOWER_Z: string = "z"
let TOKEN_CHAR_QUOTE_DOUBLE: string = "\""
let TOKEN_CHAR_QUOTE_SINGLE: string = "'"
let TOKEN_CHAR_LT: string = "<"
let TOKEN_CHAR_GT: string = ">"
let TOKEN_CHAR_PAREN_OPEN: string = "("
let TOKEN_CHAR_PAREN_CLOSE: string = ")"
let TOKEN_CHAR_SQUARE_OPEN: string = "["
let TOKEN_CHAR_SQUARE_CLOSE: string = "]"
let TOKEN_CHAR_BRACE_OPEN: string = "{"
let TOKEN_CHAR_BRACE_CLOSE: string = "}"
let TOKEN_CHAR_UNDERSCORE: string = "_"
let TOKEN_CHAR_DOT: string = "."
let TOKEN_CHAR_COMMA: string = ","
let TOKEN_CHAR_COLON: string = ":"
let TOKEN_CHAR_SEMICOLON: string = ";"
let TOKEN_CHAR_BACKSLASH: string = "\\"

class TokenFile {
    name: string

    constructor(name: string) {
        this.name = name
    }
}

class Token {
    value: string
    file: TokenFile
    newlines: int
    lineNumber: int

    constructor(value: string, file: TokenFile, newlines: int, lineNumber: int) {
        this.value = value
        this.file = file
        this.newlines = newlines
        this.lineNumber = lineNumber
    }
}

function tokenMatch(token: string, i: int, test: string): bool {
    return token[i] == test[0]
}

function tokenBetween(token: string, i: int, from: string, to: string): bool {
    return token[i] >= from[0] && token[i] <= to[0]
}

function parse(input: string, filename: string, comments: int): Token[] {
    let file = new TokenFile("")
    file.name = filename
    let token: string = ""
    let tokens: Token[]
    tokens = <Token[]>[]
    let newlines: int = 0
    let lineNumber: int = 1
    let inComment: int = 0
    let inSingleQuote: bool = 0
    let inDoubleQuote: bool = 0
    let inQuote: bool = 0
    let inQuoteEscape: bool = 0
    if (!tokenMatch(input, input.length - 1, TOKEN_CHAR_NL)) {
        input = input + "\n"
    }
    for (let i: int = 0; i < input.length; i = i + 1) {
        if (inQuoteEscape) {
            inQuoteEscape = 0
        } else {
            if (!inDoubleQuote && tokenMatch(input, i, TOKEN_CHAR_QUOTE_SINGLE)) {
                inSingleQuote = !inSingleQuote
            }
            if (!inSingleQuote && tokenMatch(input, i, TOKEN_CHAR_QUOTE_DOUBLE)) {
                inDoubleQuote = !inDoubleQuote
            }
            inQuote = inSingleQuote || inDoubleQuote
            if (inQuote) {
                if (tokenMatch(input, i, TOKEN_CHAR_BACKSLASH)) {
                    inQuoteEscape = 1
                }
            }
            if (!inQuote) {
                if (tokenMatch(input, i, TOKEN_CHAR_SEMICOLON)) {
                    inComment = 1
                }
            }
            if (tokenMatch(input, i, TOKEN_CHAR_NL)) {
                if (inComment) {
                    if (comments != 0) {
                        let newToken: Token = new Token(token, file, newlines, lineNumber)
                        tokens.push(newToken)
                        newlines = 0
                    }
                    token = ""
                }
                inComment = 0
            }
        }
        let whitespace: bool = (
            tokenMatch(input, i, TOKEN_CHAR_TAB) ||
            tokenMatch(input, i, TOKEN_CHAR_SPACE) ||
            tokenMatch(input, i, TOKEN_CHAR_NL) ||
            tokenMatch(input, i, TOKEN_CHAR_CR)
        )
        let paren: bool = (
            tokenMatch(input, i, TOKEN_CHAR_PAREN_OPEN) ||
            tokenMatch(input, i, TOKEN_CHAR_PAREN_CLOSE)
        )
        if (!inQuote && (!inComment && (whitespace || paren))) {
            if (token.length > 0) {
                let newToken: Token = new Token(token, file, newlines, lineNumber)
                tokens.push(newToken)
                newlines = 0
            }
            if (paren) {
                token = ""
                token = token + input[i]
                let newToken: Token = new Token(token, file, newlines, lineNumber)
                tokens.push(newToken)
                newlines = 0
            }
            token = ""
        } else {
            token = token + input[i]
        }
        if (tokenMatch(input, i, TOKEN_CHAR_NL)) {
            newlines = (newlines + 1)
            lineNumber = (lineNumber + 1)
        }
    }
    return tokens
}

let TOKEN_STATE_NONE: int = 0
let TOKEN_STATE_QUOTE_SINGLE: int = 1
let TOKEN_STATE_QUOTE_SINGLE_ESCAPE: int = 2
let TOKEN_STATE_QUOTE_DOUBLE: int = 3
let TOKEN_STATE_QUOTE_DOUBLE_ESACPE: int = 4
let TOKEN_STATE_QUOTE_CLOSE: int = 5
let TOKEN_STATE_SINGLE: int = 6
let TOKEN_STATE_NUMBER: int = 7
let TOKEN_STATE_GENERAL: int = 8
let TOKEN_STATE_OTHER: int = 9

function parseJs(input: string, filename: string, comments: int): Token[] {
    let file: TokenFile = new TokenFile("")
    file.name = filename
    let tokenState: int = TOKEN_STATE_NONE
    let tokenStateNext: int = TOKEN_STATE_NONE
    let token: string = ""
    let tokens: Token[] = <Token[]>[]
    let newlines: int = 0
    let lineNumber: int = 1
    if (!tokenMatch(input, (input.length - 1), TOKEN_CHAR_NL)) {
        input += "\n"
    }
    for (let i: int = 0; i < input.length; i += 1) {
        let isSpace: bool = tokenMatch(input, i, TOKEN_CHAR_TAB) || tokenMatch(input, i, TOKEN_CHAR_SPACE) || tokenMatch(input, i, TOKEN_CHAR_NL) || tokenMatch(input, i, TOKEN_CHAR_CR)
        let isAlpha: bool = tokenBetween(input, i, TOKEN_CHAR_UPPER_A, TOKEN_CHAR_UPPER_Z) || tokenBetween(input, i, TOKEN_CHAR_LOWER_A, TOKEN_CHAR_LOWER_Z)
        let isDigit: bool = tokenBetween(input, i, TOKEN_CHAR_ZERO, TOKEN_CHAR_NINE)
        let isHexDigit: bool = tokenBetween(input, i, TOKEN_CHAR_UPPER_A, TOKEN_CHAR_UPPER_F)
        let tokenStateMatch: int = TOKEN_STATE_NONE
        let tokenBreak: int = 0
        if (!isSpace) {
            tokenStateMatch = TOKEN_STATE_OTHER
        }
        if (tokenMatch(input, i, TOKEN_CHAR_PAREN_OPEN) ||
            tokenMatch(input, i, TOKEN_CHAR_PAREN_CLOSE) ||
            tokenMatch(input, i, TOKEN_CHAR_SQUARE_OPEN) || 
            tokenMatch(input, i, TOKEN_CHAR_SQUARE_CLOSE) || 
            tokenMatch(input, i, TOKEN_CHAR_BRACE_OPEN) || 
            tokenMatch(input, i, TOKEN_CHAR_BRACE_CLOSE) || 
            tokenMatch(input, i, TOKEN_CHAR_SEMICOLON) || 
            tokenMatch(input, i, TOKEN_CHAR_COLON) || 
            tokenMatch(input, i, TOKEN_CHAR_DOT) || 
            tokenMatch(input, i, TOKEN_CHAR_COMMA)) {
            tokenStateMatch = TOKEN_STATE_SINGLE
        }
        if (isAlpha || tokenMatch(input, i, TOKEN_CHAR_UNDERSCORE)) {
            tokenStateMatch = TOKEN_STATE_GENERAL
        }
        if (isDigit) {
            tokenStateMatch = TOKEN_STATE_NUMBER
        }
        if (tokenMatch(input, i, TOKEN_CHAR_QUOTE_SINGLE)) {
            tokenStateMatch = TOKEN_STATE_QUOTE_SINGLE
        }
        if (tokenMatch(input, i, TOKEN_CHAR_QUOTE_DOUBLE)) {
            tokenStateMatch = TOKEN_STATE_QUOTE_DOUBLE
        }
        if (tokenState == TOKEN_STATE_NONE) {
            tokenStateNext = tokenStateMatch
        }
        if (tokenState == TOKEN_STATE_QUOTE_SINGLE) {
            if (tokenMatch(input, i, TOKEN_CHAR_QUOTE_SINGLE)) {
                tokenStateNext = TOKEN_STATE_QUOTE_CLOSE
            }
            if (tokenMatch(input, i, TOKEN_CHAR_BACKSLASH)) {
                tokenStateNext = TOKEN_STATE_QUOTE_SINGLE_ESCAPE
            }
        }
        if (tokenState == TOKEN_STATE_QUOTE_SINGLE_ESCAPE) {
            tokenStateNext = TOKEN_STATE_QUOTE_SINGLE
        }
        if (tokenState == TOKEN_STATE_QUOTE_DOUBLE) {
            if (tokenMatch(input, i, TOKEN_CHAR_QUOTE_DOUBLE)) {
                tokenStateNext = TOKEN_STATE_QUOTE_CLOSE
            }
            if (tokenMatch(input, i, TOKEN_CHAR_BACKSLASH)) {
                tokenStateNext = TOKEN_STATE_QUOTE_DOUBLE_ESACPE
            }
        }
        if (tokenState == TOKEN_STATE_QUOTE_DOUBLE_ESACPE) {
            tokenStateNext = TOKEN_STATE_QUOTE_DOUBLE
        }
        if (tokenState == TOKEN_STATE_QUOTE_CLOSE) {
            tokenBreak = 1
            tokenStateNext = tokenStateMatch
        }
        if (tokenState == TOKEN_STATE_SINGLE) {
            tokenStateNext = tokenStateMatch
            tokenBreak = 1
        }
        if (tokenState == TOKEN_STATE_NUMBER) {
            if (!(isDigit || isHexDigit || tokenMatch(input, i, TOKEN_CHAR_DOT) || tokenMatch(input, i, TOKEN_CHAR_LOWER_X))) {
                tokenStateNext = tokenStateMatch
                tokenBreak = 1
            }
        }
        if (tokenState == TOKEN_STATE_GENERAL) {
            if (tokenStateMatch != tokenStateNext && !isDigit && !tokenMatch(input, i, TOKEN_CHAR_UNDERSCORE)) {
                tokenStateNext = tokenStateMatch
                tokenBreak = 1
            }
        }
        if (tokenState == TOKEN_STATE_OTHER) {
            if (tokenStateMatch != tokenStateNext) {
                tokenStateNext = tokenStateMatch
                if (!(token == "-" && isDigit)) {
                    tokenBreak = 1
                }
            }
        }
        if (tokenBreak) {
            tokens.insert(tokens.length, new Token(token, file, newlines, lineNumber))
            newlines = 0
            token = ""
        }
        if (!isSpace || tokenState == TOKEN_STATE_QUOTE_SINGLE || tokenState == TOKEN_STATE_QUOTE_DOUBLE) {
            token += input[i]
        }
        tokenState = tokenStateNext
        if (tokenMatch(input, i, TOKEN_CHAR_NL)) {
            newlines += 1
            lineNumber += 1
        }
    }
    return tokens
}
