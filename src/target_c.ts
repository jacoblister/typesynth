import * as NODE from "./node"

export { nodeToC }

function nodeToCPreprocess(node: NODE.Node): string {
    let value: string = node.value
    if (NODE.getType(node) == NODE.NODE_TYPE_PREPROCESS) {
        value = ""
        for (let i: int = 1; i < node.value.length; i += 1) {
            value += node.value[i]
        }
    }
    return value
}

function nodeToCType(name: string, node: NODE.Node, elementOnly: int): string {
    let type: string = node.value
    let suffix: string = ""
    if (node.value == "str") {
        type = "char*"
    }
    if (node.value == "vec") {
        type = nodeToCType("", node.child[1], 0)
        if (name != "") {
            suffix += "[" + nodeToCPreprocess(node.child[0]) + "]"
        } else {
            type += "*"
        }
    }
    if (node.value == "arr") {
        type = nodeToCType("", node.child[0], 0)
        if (!elementOnly) {
            type += "*"
        }
    }
    if (node.value == "struct") {
        type = "struct " + node.child[0].value + "*"
    }
    if (type == "map") {
        type = "std::map<" + nodeToCType("", node.child[0], 0) + ", " + nodeToCType("", node.child[1], 0) + ">"
    }
    if (type == "func") {
        let returnType: string = "void"
        let params: string = "void"
        let i: int = 0
        while (i < node.child.length) {
            let childNode: NODE.Node = node.child[i]
            if (childNode.value == "param") {
                if (params == "void") {
                    params = ""
                } else {
                    params += ", "
                }
                let cVar: string = ""
                cVar = nodeToCType(childNode.child[0].value, childNode.child[1], 0)
                params += cVar
                node.child.remove(i, 1)
                i = i - 1
            }
            if (childNode.value == "result") {
                returnType = nodeToCType("", childNode.child[0], 0)
                node.child.remove(i, 1)
                i = i - 1
            }
            i += 1
        }
        let funcdef: string = ""
        if (node.child.length > 0) {
            if (NODE.getType(node.child[0]) == NODE.NODE_TYPE_STR) {
                let funcName: string = node.child[0].value
                if (funcName == "main") {
                    funcName = "main_args"
                    params = "char **args"
                    returnType = "int"
                }
                funcdef += returnType + " " + funcName + "(" + params + ")"
            } else {
                funcdef += "[=](" + params + ")"
            }
        } else {
            funcdef += returnType + " (*" + name + ")(" + params + ")"
            name = ""
        }
        type = funcdef
    }
    let out: string = type
    if (name != "") {
        out += " " + name + suffix
    }
    return out
}

function nodeToCtoString(node: NODE.Node, castInt: int): string {
    if (node.typeNode) {
        if (node.typeNode.value == "str") {
            return "tostring_char_p"
        }
        if (node.typeNode.value == "int" || node.typeNode.value == "char") {
            return (castInt ? "tostring_int" : "tostring_char")
        }
        if (node.typeNode.value == "float") {
            return "tostring_float"
        }
    }
    return "tostring_unknown"
}

function nodeToCLength(node: NODE.Node): string {
    let getTypeStr: bool = 0
    if (node.typeNode) {
        getTypeStr = node.typeNode.value == "str"
    }
    if (getTypeStr) {
        return "strlen"
    }
    return "ARRAY_LENGTH"
}

function nodeToCHasKeyword(node: NODE.Node, keyword: string): int {
    if (node.value == keyword) {
        return 1
    }
    for (let i: int = 0; i < node.child.length; i += 1) {
        if (nodeToCHasKeyword(node.child[i], keyword) != 0) {
            return 1
        }
    }
    return 0
}

function nodeToCNodeIntToStr(value: int): string {
    if (value == 10) { return "10" }
    if (value > 10) { return "BROKEN" }

    let digits = <string[]>["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
    return digits[value]
}

function nodeToCNode(depth: int, node: NODE.Node): string {
    let s: string = ""
    depth += 1
    node = NODE.copy(node)
    if (NODE.getType(node) != NODE.NODE_TYPE_EXPR) {
        let value: string = nodeToCPreprocess(node)
        if (NODE.getType(node) == NODE.NODE_TYPE_COMMENT) {
            value = "// "
            value += node.value
        }
        s += value
        return s
    }
    let blockStart: string = ""
    let blockEnd: string = ""
    let blockSeperator: string = " "
    if (node.value == "root") {
        blockStart = ""
        blockEnd = ""
        let hasMain: int = 0
        for (let i: int = 0; i < node.child.length; i += 1) {
            if (node.child[i].value == "func" && node.child[i].child[0].value == "main") {
                hasMain = 1
            }
        }
        if (nodeToCHasKeyword(node, "print") != 0) {
            blockStart += "#include <stdio.h>\n"
            blockStart += "#include <stdlib.h>\n"
            blockStart += "#include <string.h>\n"
            blockStart += "\n"
            blockStart += "char *tostring_char_p(char *value) { return value; }\n"
            blockStart += "char *tostring_char(int value) { static char buf[256]; sprintf(buf, \"%c\", value); return buf; }\n"
            blockStart += "char *tostring_int(int value) { static char buf[256]; sprintf(buf, \"%d\", value); return buf; }\n"
            blockStart += "char *tostring_float(float value) { static char buf[256]; sprintf(buf, \"%g\", value); return buf; }\n"
            blockStart += "char *tostring_double(double value) { static char buf[256]; sprintf(buf, \"%g\", value); return buf; }\n"
            blockStart += "void *STRING_ALLOC(char *str) {"
            blockStart += "  char *data = malloc(strlen(str) + 1);"
            blockStart += "  memcpy(data, str, strlen(str) + 1);"
            blockStart += "  return data;"
            blockStart += "}\n"
            blockStart += "char *STRING_APPEND(char *str, char *append) {"
            blockStart += "  char *data = malloc(strlen(str) + strlen(append) + 1);"
            blockStart += "  memcpy(data, str, strlen(str) + 1);"
            blockStart += "  strcat(data, append);"
            blockStart += "  return data;"
            blockStart += "}\n"
        }
        if (hasMain) {
            blockStart += "struct ARRAY_HEADER {"
            blockStart += "    int element_size;"
            blockStart += "    int element_count;"
            blockStart += "};\n"
            blockStart += "void *ARRAY_ALLOC(int element_size, int element_count) {"
            blockStart += "  struct ARRAY_HEADER *header = calloc(1, sizeof(struct ARRAY_HEADER) + (element_size * element_count));"
            blockStart += "  header->element_size = element_size;"
            blockStart += "  header->element_count = element_count;"
            blockStart += "  void *data = ((char *)header) + sizeof(struct ARRAY_HEADER);"
            blockStart += "  return data;"
            blockStart += "}\n"
            blockStart += "void *ARRAY_INSERT(void *data, int index) {"
            blockStart += "  struct ARRAY_HEADER *header = (void *)((char *)data - sizeof(struct ARRAY_HEADER));"
            blockStart += "  header = realloc(header, sizeof(struct ARRAY_HEADER) + (header->element_size * (header->element_count + 1)));"
            blockStart += "  data = ((char *)header) + sizeof(struct ARRAY_HEADER);"
            blockStart += "  memmove((char *)data + ((index + 1) * header->element_size), (char *)data + (index * header->element_size), (header->element_count - index) * header->element_size);"
            blockStart += "  header->element_count = header->element_count + 1;"
            blockStart += "  return data;"
            blockStart += "}\n"
            blockStart += "void *ARRAY_REMOVE(void *data, int index, int count) {"
            blockStart += "  struct ARRAY_HEADER *header = (void *)((char *)data - sizeof(struct ARRAY_HEADER));"
            blockStart += "  memmove((char *)data + (index * header->element_size), (char *)data + ((index + count) * header->element_size), (header->element_count - (index + count)) * header->element_size);"
            blockStart += "  header->element_count = header->element_count - count;"
            blockStart += "  header = realloc(header, sizeof(struct ARRAY_HEADER) + (header->element_size * header->element_count));"
            blockStart += "  data = (void *)((char *)header + sizeof(struct ARRAY_HEADER));"
            blockStart += "  return data;"
            blockStart += "}\n"
            blockStart += "void ARRAY_FREE(void *data) {"
            blockStart += "  struct ARRAY_HEADER *header = (void *)((char *)data - sizeof(struct ARRAY_HEADER));"
            blockStart += "  free(header);"
            blockStart += "}\n"
            blockStart += "int ARRAY_LENGTH(void *data) {"
            blockStart += "  struct ARRAY_HEADER *header = (void *)((char *)data - sizeof(struct ARRAY_HEADER));"
            blockStart += "  return header->element_count;"
            blockStart += "}\n"
            blockStart += "\n\n"
        }
        if (hasMain) {
            blockEnd += "int main(int argc, char** argv) {\n"
            blockEnd += "  char **args = ARRAY_ALLOC(sizeof(char *),argc);\n"
            blockEnd += "  for (int i = 0; i < argc; i++) { args[i] = argv[i]; }\n"
            blockEnd += "  return main_args(args);\n"
            blockEnd += "};\n"
        }
    }
    if (node.value == "+" || node.value == "&&" || node.value == "||") {
        node = NODE.expand(node)
    }
    if (node.value == "") {
        blockStart = "{"
        blockEnd = "}"
    }
    if (node.value == "@define") {
        blockStart = "#define " + node.child[0].value + " " + node.child[1].value
        blockEnd = ""
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "@if") {
        if (node.child[0].value == "TARGET_C") {
            node.child.remove(0, 1)
            node.child.remove(0, 1)
        } else {
            while (node.child.length > 0) {
                node.child.remove(0, 1)
            }
        }
    }
    if (node.value == "extern") {
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    // if (node.value == "asm") {
    //   let quotedline: string = node.child[0].value
    //   let line: string = ""
    //   for (let j: int = 1; j < (quotedline.length - 1); j += 1) {
    //     if (quotedline[j] != 92) {
    //       line += quotedline[j]
    //     }
    //   }
    //   blockStart = line
    //   blockEnd = "\n"
    //   while (node.child.length > 0) {
    //     node.child.remove(0, 1)
    //   }
    // }
    if (node.value == "struct") {
        blockStart = "struct " + node.child[0].value + " {"
        blockEnd = "};"
        node.child.remove(0, 1)
    }
    if (node.value == "func") {
        blockStart = nodeToCType("", node, 0)
        let lastChild: NODE.Node = node.child[(node.child.length - 1)]
        if (lastChild.value == "param" || lastChild.value == "result" || NODE.getType(lastChild) == NODE.NODE_TYPE_STR) {
            blockEnd = ";"
        } else {
            blockStart += " {"
            blockEnd = "}"
        }
        if (NODE.getType(node.child[0]) == NODE.NODE_TYPE_STR) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "call") {
        blockStart = nodeToCNode(depth, node.child[0]) + "("
        blockEnd = ")"
        node.child.remove(0, 1)
        blockSeperator = ", "
    }
    if (node.value == "let" || node.value == "local") {
        let name: string = node.child[0].value
        let type: string = nodeToCType(name, node.child[1], 0)
        blockStart = type
        blockEnd = ""
        node.child.remove(0, 1)
        node.child.remove(0, 1)
        if (node.child.length == 1) {
            node.child.insert(0, NODE.New("="))
            if (node.child[1].value == "alloc" && node.child[1].child[0].value == "arr") {
                for (let i: int = 1; i < node.child[1].child.length; i += 1) {
                    blockEnd += ";" + name + "[" + nodeToCNodeIntToStr(i - 1) +  "]=" + node.child[1].child[i].value
                }
            }
            if (node.child[1].value == "alloc" && node.child[1].child[0].value == "struct" && node.child[1].child.length > 1) {
                blockEnd += "; " + node.child[1].child[0].child[0].value + "_constructor(" + name + ", "
                for (let i: int = 1; i < node.child[1].child.length; i += 1) {
                    blockEnd += nodeToCNode(depth, node.child[1].child[i])
                    if (i < node.child[1].child.length - 1) {
                        blockEnd += ", "
                    }
                }
                blockEnd += ")"
            }
        }
    }
    if (node.value == "alloc") {
        if (node.child[0].value == "str") {
            let alloc_string: string = "\"\""
            if (node.child.length > 1) {
                alloc_string = node.child[1].value
            }
            blockStart = "STRING_ALLOC(" + alloc_string + ")"
        }
        if (NODE.getType(node.child[0]) == NODE.NODE_TYPE_EXPR) {
            if (node.child[0].value == "arr") {
                blockStart = "ARRAY_ALLOC(sizeof(" + nodeToCType("", node.child[0].typeNode, 1) + ")," + nodeToCNodeIntToStr(node.child.length - 1) + ")"
            }
            if (node.child[0].value == "vec") {
                blockStart = "{"
                for (let i: int = 1; i < node.child.length; i += 1) {
                    blockStart += nodeToCNode(depth, node.child[i])
                    if (i < node.child.length - 1) {
                        blockStart += ", "
                    }
                }
                blockStart += "}"
            }
            if (node.child[0].value == "struct") {
                blockStart = "ARRAY_ALLOC(sizeof(struct " + node.child[0].child[0].value + "),1)"
            }
            if (node.child[0].value == "map") {
                blockStart = "{}"
            }
        }
        while (node.child.length > 0) {
            node.child.remove(node.child.length - 1, 1)
        }
    }
    if (node.value == "free") {
        let array: string = nodeToCNode(depth, node.child[0])
        blockStart = "ARRAY_FREE(" + array
        blockEnd = ")"
        node.child.remove(0, 1)
    }
    if (node.value == "#") {
        blockStart = nodeToCLength(node.child[0]) + "("
        blockEnd = ")"
    }
    if (node.value == "insert") {
        let init: string = ""
        if (node.child[2].value == "alloc" && node.child[2].child[0].value == "arr") {
            for (let i: int = 1; i < node.child[2].child.length; i += 1) {
                init += ";" + node.child[0].value + "[" + node.child[1].value + "]" + "[" + nodeToCNodeIntToStr(i - 1) + "]=" + node.child[2].child[i].value
            }
        }
        let array: string = nodeToCNode(depth, node.child[0])
        let position: string = nodeToCNode(depth, node.child[1])
        let value: string = nodeToCNode(depth, node.child[2])
        blockStart = "{int __index__=" + position + ";" + array + "=ARRAY_INSERT(" + array + ",__index__);" + array + "[__index__]=" + value + init + ";}"
        blockEnd = ""
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "remove") {
        let array: string = nodeToCNode(depth, node.child[0])
        let first: string = nodeToCNode(depth, node.child[1])
        let last: string = nodeToCNode(depth, node.child[2])
        blockStart = array + "=ARRAY_REMOVE(" + array + ", " + first + ", " + last
        blockEnd = ")"
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "slice") {
        blockStart = nodeToCNode(depth, node.child[0]) + ".substr(" + nodeToCNode(depth, node.child[1]) + ", " + nodeToCNode(depth, node.child[2])
        blockEnd = ")"
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "get") {
        blockStart = nodeToCNode(depth, node.child[0])
        blockEnd = ""
        for (let i: int = 1; i < node.child.length; i += 1) {
            let type: string = node.child[(i - 1)].typeNode.value
            let value: string = nodeToCNode(depth, node.child[i])
            if (type == "arr" || type == "vec" || type == "map" || type == "str") {
                blockEnd += "[" + value + "]"
            } else {
                blockEnd += "->" + value + ""
            }
        }
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "set") {
        blockStart = nodeToCNode(depth, node.child[0])
        blockEnd = ""
        let n: int = node.child.length - 1
        for (let i: int = 1; i < n; i += 1) {
            let type: string = node.child[i - 1].typeNode.value
            let value: string = nodeToCNode(depth, node.child[i])
            if (type == "arr" || type == "vec" || type == "map" || type == "str") {
                blockEnd += "[" + value + "]"
            } else {
                blockEnd += "->" + value + ""
            }
        }
        blockEnd += " = "
        let getTypeStr: bool = 0
        if (node.typeNode) {
            getTypeStr = node.typeNode.value == "str"
        }
        if (getTypeStr) {
            blockEnd += "STRING_ALLOC("
        }
        blockEnd += nodeToCNode(depth, node.child[n])
        if (getTypeStr) {
            blockEnd += ")"
        }
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "cast") {
        if (node.child[1].value == "str") {
            blockStart = "tostring_int(" + nodeToCNode(depth, node.child[0])
            blockEnd = ")"
        }
        if (node.child[1].value == "int") {
            blockStart = "(int)"
            blockEnd = nodeToCNode(depth, node.child[0])
        }
        node.child.remove(0, 1)
        node.child.remove(0, 1)
    }
    if (node.value == "then") {
        blockStart = "{"
        blockEnd = "}"
    }
    if (node.value == "else") {
        blockStart = "else {"
        blockEnd = "}"
    }
    if (node.value == "for") {
        if (node.child.length == 5) {
            node.child[2].flags = (node.child[2].flags | NODE.NODE_FLAG_NO_BRACKETS)
            blockStart = "for (int " + nodeToCNode(depth, node.child[0]) + " = " + nodeToCNode(depth, node.child[1]) + "; " 
            blockStart += nodeToCNode(depth, node.child[2]) + "; "
            blockStart += nodeToCNode(depth, node.child[0]) + " += "+ nodeToCNode(depth, node.child[3]) + ") "
            node.child.remove(0, 4)
            blockEnd = ""
        }
        if (node.child.length == 4 && node.child[0].child.length > 0) {
            node.child[1].flags = (node.child[1].flags | NODE.NODE_FLAG_NO_BRACKETS)
            blockStart = "for (" + nodeToCNode(depth, node.child[0]) + "; " + nodeToCNode(depth, node.child[1]) + "; " + nodeToCNode(depth, node.child[2]) + ") "
            node.child.remove(0, 3)
            blockEnd = ""
        }
    }
    if (node.value == "if" || node.value == "while") {
        blockStart = node.value + " ("
        node.child[0].flags = (node.child[0].flags | NODE.NODE_FLAG_NO_BRACKETS)
        let block: string = nodeToCNode(depth, node.child[0])
        blockStart += block + ") "
        blockEnd = ""
        node.child.remove(0, 1)
    }
    if (node.value == "do") {
        blockStart = "{"
        blockEnd = "}"
    }
    if (node.value == "break") {
        blockStart = "break"
        blockEnd = ""
    }
    if (node.value == "?") {
        blockStart = "(" + nodeToCNode(depth, node.child[0]) + " ? " + nodeToCNode(depth, node.child[1]) + " : " + nodeToCNode(depth, node.child[2])
        blockEnd = ")"
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "print") {
        blockStart = "puts(" + nodeToCtoString(node.child[0], 1) + "("
        blockEnd = "))"
    }
    if (node.value == "!") {
        blockStart = "(!"
        blockEnd = ")"
    }
    if (node.value == ">>" || node.value == "<<" || node.value == "=" || node.value == "&&" || node.value == "||" || node.value == ">=" || node.value == "<=" || node.value == "<>" || node.value == "+" || node.value == "-" || node.value == "*" || node.value == "/" || node.value == "^" || node.value == "%" || node.value == "&" || node.value == "|" || node.value == "~" || node.value == "<" || node.value == ">") {
        if (!(node.flags & NODE.NODE_FLAG_NO_BRACKETS)) {
            blockStart = "("
            blockEnd = ")"
        }
        if (node.value == "=") {
            if (node.child[0].typeNode.value == "str" || node.child[1].typeNode.value == "str") {
                blockStart = "(strcmp("
                blockEnd = ") == 0 ? 1 : 0)"
                node.value = ", "
            } else {
                node.value = "=="
            }
        }
        if (node.value == "<>") {
            node.value = "!="
        }
        if ((node.value == "<<" || node.value == "+") && node.child[0].typeNode.value == "str") {
            blockStart = ""
            if (node.value == "<<") {
                blockStart += node.child[0].value + " = "
            }
            blockStart += "STRING_APPEND(" + nodeToCNode(depth, node.child[0]) + ", " + nodeToCtoString(node.child[1], 0) + "(" + nodeToCNode(depth, node.child[1])
            blockEnd = "))"
            while (node.child.length > 0) {
                node.child.remove(0, 1)
            }
        } else {
            node.child.insert(1, NODE.New(node.value))
        }
    }
    if (node.value == "return") {
        blockStart = "return"
        if (node.child.length > 0) {
            blockStart += " "
        }
        blockEnd = ""
    }
    s += blockStart
    for (let i: int = 0; i < node.child.length; i += 1) {
        let nodeChild: NODE.Node = node.child[i]
        let indentNeeded: int = NODE.indentNeeded(node, nodeChild)
        let indentDepth: int = indentNeeded ? depth : depth - 1
        let indent: string = "  "
        if (indentNeeded) {
            s += "\n"
            for (let i: int = 0; i < indentDepth - 1; i += 1) {
                s += indent
            }
        } else {
            if (i > 0) {
                s += blockSeperator
            }
        }
        if ((nodeChild.value == "func" || nodeChild.value == "struct" || nodeChild.value == "module") && i > 0) {
            s += "\n"
            for (let i: int = 0; i < indentDepth - 1; i += 1) {
                s += indent
            }
        }
        let child: string = nodeToCNode(indentDepth, nodeChild)
        s += child
        if (
            (node.value == "" ||
                node.value == "root" ||
                node.value == "module" ||
                node.value == "@if" ||
                node.value == "func" ||
                node.value == "struct" ||
                node.value == "do" ||
                node.value == "then" ||
                node.value == "else")
            &&
            (nodeChild.value == "let" ||
                nodeChild.value == "set" ||
                nodeChild.value == "<<" ||
                nodeChild.value == "call" ||
                nodeChild.value == "print" ||
                nodeChild.value == "break" ||
                nodeChild.value == "return" ||
                nodeChild.value == "insert" ||
                nodeChild.value == "remove" ||
                nodeChild.value == "free")) {
            s += ";"
        }
        if (indentNeeded && i == node.child.length - 1) {
            s += "\n"
            for (let i: int = 0; i < indentDepth - 2; i += 1) {
                s += indent
            }
        }
    }
    s += blockEnd
    return s
}

function nodeToC(node: NODE.Node): string {
    return nodeToCNode(0, node)
}