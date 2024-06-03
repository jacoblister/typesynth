import * as NODE from "./node"

export { nodeToCpp, nodeToCppNoRef }

function nodeToCppPreprocess(node: NODE.Node): string {
    let value: string = node.value
    if (NODE.getType(node) == NODE.NODE_TYPE_PREPROCESS) {
        value = ""
        for (let i: int = 1; i < node.value.length; i += 1) {
            value += node.value[i]
        }
    }
    return value
}

function nodeToCppType(node: NODE.Node): string {
    let type: string = node.value
    if (node.value == "get") {
        type = node.child[0].value + "::" + node.child[1].value
    }
    if (node.value == "str") {
        type = "std::string"
    }
    if (node.value == "vec") {
        type = "Vec<" + nodeToCppType(node.child[1]) + ", " + nodeToCppPreprocess(node.child[0]) + ">"
    }
    if (node.value == "arr") {
        type = "Array<" + nodeToCppType(node.child[0]) + ">"
    }
    if (node.value == "struct") {
        type = "Ref<" + nodeToCppType(node.child[0]) + ">"
        if (node.flags & NODE.NODE_FLAG_NO_REF) {
            type = nodeToCppType(node.child[0])
            type += "*"
        }
    }
    if (type == "map") {
        type = "Map<" + nodeToCppType(node.child[0]) + ", " + nodeToCppType(node.child[1]) + ">"
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
                let type: string = ""
                type = nodeToCppType(childNode.child[1])
                params += type + " " + childNode.child[0].value
                node.child.remove(i, 1)
                i = i - 1
            }
            if (childNode.value == "result") {
                returnType = nodeToCppType(childNode.child[0])
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
                    funcName = "mainArgs"
                    params = "std::vector<std::string>& args"
                    returnType = "int"
                }
                if (!(node.flags & NODE.NODE_FLAG_CONSTRUCTOR)) {
                    funcdef += returnType + " "
                }
                funcdef += funcName + "(" + params + ")"
            } else {
                funcdef += "[=](" + params + ") mutable"
            }
        } else {
            funcdef += "std::function<" + returnType + " (" + params + ")>"
        }
        type = funcdef
    }
    return type
}

function nodeToCppNode(depth: int, node: NODE.Node): string {
    let s: string = ""
    depth += 1
    node = NODE.copy(node)
    if (NODE.getType(node) != NODE.NODE_TYPE_EXPR) {
        let value: string = nodeToCppPreprocess(node)
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
        blockStart += "#include <iostream>\n"
        blockStart += "#include <sstream>\n"
        blockStart += "#include <memory>\n"
        blockStart += "#include <string>\n"
        blockStart += "#include <vector>\n"
        blockStart += "#include <array>\n"
        blockStart += "#include <map>\n"
        blockStart += "#include <functional>\n"
        blockStart += "\n"
        blockStart += "template<typename T> std::string tostring(const T& x) {\n"
        blockStart += "  std::stringstream ss;\n"
        blockStart += "  ss << x;\n"
        blockStart += "  return ss.str();\n"
        blockStart += "\n"
        blockStart += "}\n\n"
        blockStart += "template <typename T>\n"
        blockStart += "class Ref {\n"
        blockStart += " public:\n"
        blockStart += "  Ref() : object(std::shared_ptr<T>()) {}\n"
        blockStart += "  Ref(const T &init) : object(std::shared_ptr<T>(new T(init))) {}\n"
        blockStart += "  std::shared_ptr<T> operator->() const { return object; }\n"
        blockStart += "  bool operator == (const Ref &ref) { return this->object == ref.object; }\n"
        blockStart += "  void operator=(const int other) { object = nullptr; }\n"
        blockStart += "  operator bool() const { return object ? true : false; };\n"
        blockStart += " private:\n"
        blockStart += "  std::shared_ptr<T> object;\n"
        blockStart += "};\n\n"
        blockStart += "template <class T, std::size_t N>\n"
        blockStart += "class Vec {\n"
        blockStart += " public:\n"
        blockStart += "  Vec(): array(std::shared_ptr<std::array<T,N>>(new std::array<T,N>())) {}\n"
        blockStart += "  Vec(const std::initializer_list<T> &init) {\n"
        blockStart += "    array = std::shared_ptr<std::array<T,N>>(new std::array<T,N>());\n"
        blockStart += "    int i = 0; for (auto item: init) {array->at(i) = item; i++; }\n"
        blockStart += "  }\n"
        blockStart += "  T& operator[](int index) { return array->at(index); }\n"
        blockStart += "  int size() { return array->size(); }\n"
        blockStart += " private:\n"
        blockStart += "  std::shared_ptr<std::array<T, N>> array;\n"
        blockStart += "};\n\n"
        blockStart += "template <class T>\n"
        blockStart += "class Array {\n"
        blockStart += " public:\n"
        blockStart += "  Array(): vector(std::shared_ptr<std::vector<T>>(new std::vector<T>())) {}\n"
        blockStart += "  Array(const std::initializer_list<T> &init): vector(std::shared_ptr<std::vector<T>>(new std::vector<T>(init))) {}\n"
        blockStart += "  T& operator[](int index) { return vector->at(index); }\n"
        blockStart += "  int size() { return vector->size(); }\n"
        blockStart += "  void insert(int index, const T& val) { vector->insert(vector->begin() + index, val); }\n"
        blockStart += "  void remove(int index, int count) { vector->erase(vector->begin() + index, vector->begin() + index + count); }\n"
        blockStart += "  void push_back(const T& val) { vector->push_back(val); }\n"
        blockStart += " private:\n"
        blockStart += "  std::shared_ptr<std::vector<T>> vector;\n"
        blockStart += "};\n\n"
        blockStart += "template <class F, class T>\n"
        blockStart += "class Map {\n"
        blockStart += " public:\n"
        blockStart += "  Map(): map(std::shared_ptr<std::map<F, T>>(new std::map<F, T>())) {}\n"
        blockStart += "  Map(const std::initializer_list<std::pair<const F, T>> &init): map(std::shared_ptr<std::map<F, T>>(new std::map<F, T>(init))) {}\n"
        blockStart += "  T& operator[](F key) { if (map->count(key) == 0) { map->insert({key, T{}}); } return map->at(key); }\n"
        blockStart += "  void insert(std::pair<F, T> item) { map->insert(item); }\n"
        blockStart += "  void remove(F item) { map->erase(item); }\n"
        blockStart += "  std::shared_ptr<std::map<F, T>> map;\n"
        blockStart += "};\n\n"
        if (hasMain) {
            blockEnd += "int main(int argc, char** argv) {\n"
            blockEnd += "  std::vector<std::string> args(argv, argv + argc);\n"
            blockEnd += "  return mainArgs(args);\n"
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
        if (node.child[0].value == "TARGET_CPP") {
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
    if (node.value == "module") {
        let altValue: string = ""
        for (let i: int = 0; i < node.child.length; i += 1) {
            if (node.child[i].value == "alt") {
                altValue = node.child[i].child[0].value
            }
        }
        if (altValue.length > 0) {
            blockStart = altValue
            blockEnd = ""
            while (node.child.length > 0) {
                node.child.remove(0, 1)
            }
        } else {
            blockStart = "namespace " + node.child[0].value + " {"
            blockEnd = "}"
            for (let i: int = 0; i < node.child.length; i += 1) {
                if (node.child[i].value == "export") {
                    node.child.remove(i, 1)
                }
            }
            node.child.remove(0, 1)
        }
    }
    if (node.value == "struct") {
        let defaultConstructorRequired: int = 0
        for (let i: int = 0; i < node.child.length; i += 1) {
            let child: NODE.Node = node.child[i]
            if (child.value == "func" && child.child[0].value == "constructor") {
                child.child[0].value = node.child[0].value
                node.child[i].flags = (node.child[i].flags | NODE.NODE_FLAG_CONSTRUCTOR)
                for (let j: int = 0; j < child.child.length; j += 1) {
                    if (child.child[j].value == "param") {
                        defaultConstructorRequired = 1
                    }
                }
            }
        }
        blockStart = "struct " + node.child[0].value + " {"
        blockEnd = "};"
        node.child.remove(0, 1)
    }
    if (node.value == "func") {
        blockStart = nodeToCppType(node)
        let lastChild: NODE.Node = node.child[node.child.length - 1]
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
        blockStart = nodeToCppNode(depth, node.child[0]) + "("
        blockEnd = ")"
        node.child.remove(0, 1)
        blockSeperator = ", "
    }
    if (node.value == "let" || node.value == "local") {
        let type: string = nodeToCppType(node.child[1])
        blockStart = type + " "
        blockEnd = ""
        node.child.remove(1, 1)
        if (node.child.length == 2) {
            node.child.insert(1, NODE.New("="))
        }
    }
    if (node.value == "alloc") {
        if (node.child[0].value == "str") {
            blockStart = "\"\""
            if (node.child.length > 1) {
                blockStart = node.child[1].value
            }
        }
        if (NODE.getType(node.child[0]) == NODE.NODE_TYPE_EXPR) {
            if (node.child[0].value == "vec" || node.child[0].value == "arr") {
                blockStart += "{"
                for (let i: int = 1; i < node.child.length; i += 1) {
                    blockStart += nodeToCppNode(depth, node.child[i])
                    if (i < node.child.length - 1) {
                        blockStart += ", "
                    }
                }
                blockStart += "}"
            }
            if (node.child[0].value == "struct") {
                let type: string = nodeToCppNode(depth, node.child[0].child[0])
                blockStart = type + "{"
                for (let i: int = 1; i < node.child.length; i += 1) {
                    blockStart += nodeToCppNode(depth, node.child[i])
                    if (i < node.child.length - 1) {
                        blockStart += ", "
                    }
                }
                blockStart += "}"
                if (node.flags & NODE.NODE_FLAG_NO_REF) {
                    blockStart = "new " + type + "("
                    for (let i: int = 1; i < node.child.length; i += 1) {
                        blockStart += nodeToCppNode(depth, node.child[i])
                        if (i < node.child.length - 1) {
                            blockStart += ", "
                        }
                    }
                    blockStart += ")"
                }
            }
            if (node.child[0].value == "map") {
                blockStart += "{"
                for (let i: int = 1; i < node.child.length; i += 2) {
                    blockStart += "{" + nodeToCppNode(depth, node.child[i]) + "," + nodeToCppNode(depth, node.child[i + 1])+ "}"
                    if (i < node.child.length - 2) {
                        blockStart += ", "
                    }
                }
                blockStart += "}"
            }
        }
        while (node.child.length > 0) {
            node.child.remove(node.child.length - 1, 1)
        }
    }
    if (node.value == "free") {
        blockStart = "/*GC*/"
        node.child.remove(0, 1)
    }
    if (node.value == "#") {
        blockEnd = ".size()"
    }
    if (node.value == "insert") {
        let array: string = nodeToCppNode(depth, node.child[0])
        let position: string = nodeToCppNode(depth, node.child[1])
        let value: string = nodeToCppNode(depth, node.child[2])
        blockStart = array + ".insert(" + position + ", " + value
        blockEnd = ")"
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "remove") {
        if (node.child.length == 2) {
            blockStart = nodeToCppNode(depth, node.child[0]) + ".remove(" + nodeToCppNode(depth, node.child[1])
            blockEnd = ")"
        } else {
            let array: string = nodeToCppNode(depth, node.child[0])
            let index: string = nodeToCppNode(depth, node.child[1])
            let count: string = nodeToCppNode(depth, node.child[2])
            blockStart = array + ".remove(" + index + ", " + count
            blockEnd = ")"
        }
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "slice") {
        blockStart = nodeToCppNode(depth, node.child[0]) + ".substr(" + nodeToCppNode(depth, node.child[1]) + ", " + nodeToCppNode(depth, node.child[2])
        blockEnd = ")"
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "push") {
        blockStart = nodeToCppNode(depth, node.child[0]) + ".push_back(" + nodeToCppNode(depth, node.child[1])
        blockEnd = ")"
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "get") {
        blockStart = nodeToCppNode(depth, node.child[0])
        blockEnd = ""
        for (let i: int = 1; i < node.child.length; i += 1) {
            let type: string = node.child[i - 1].typeNode.value
            let value: string = nodeToCppNode(depth, node.child[i])
            if (type == "module") {
                blockEnd += "::" + value + ""
            } else {
                if (type == "vec" || type == "arr" || type == "map" || type == "str") {
                    blockEnd += "[" + value + "]"
                } else {
                    blockEnd += "->" + value + ""
                }
            }
        }
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "set") {
        blockStart = nodeToCppNode(depth, node.child[0])
        blockEnd = ""
        let n: int = (node.child.length - 1)
        for (let i: int = 1; i < n; i += 1) {
            let type: string = node.child[i - 1].typeNode.value
            let value: string = nodeToCppNode(depth, node.child[i])
            if (type == "module") {
                blockEnd += "::" + value + ""
            } else {
                if (type == "vec" || type == "arr" || type == "map" || type == "str") {
                    blockEnd += "[" + value + "]"
                } else {
                    blockEnd += "->" + value + ""
                }
            }
        }
        blockEnd += " = "
        blockEnd += nodeToCppNode(depth, node.child[n])
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "cast") {
        if (node.child[1].value == "str") {
            blockStart = "tostring(" + nodeToCppNode(depth, node.child[0])
            blockEnd = ")"
        }
        if (node.child[1].value == "int") {
            blockStart = "(int)"
            blockEnd = nodeToCppNode(depth, node.child[0])
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
            blockStart = "for (int " + nodeToCppNode(depth, node.child[0]) + " = " + nodeToCppNode(depth, node.child[1]) + "; "
            node.child[2].flags = (node.child[2].flags | NODE.NODE_FLAG_NO_BRACKETS)
            blockStart += nodeToCppNode(depth, node.child[2]) + "; "
            blockStart += nodeToCppNode(depth, node.child[0]) + " += " + nodeToCppNode(depth, node.child[3]) + ") "
            node.child.remove(0, 4)
            blockEnd = ""
        }
        if (node.child.length == 4 && node.child[0].child.length > 0) {
            node.child[1].flags = (node.child[1].flags | NODE.NODE_FLAG_NO_BRACKETS)
            blockStart = "for (" + nodeToCppNode(depth, node.child[0]) + "; "
            blockStart += nodeToCppNode(depth, node.child[1]) + "; "
            blockStart += nodeToCppNode(depth, node.child[2]) + ") "
            node.child.remove(0, 3)
            blockEnd = ""
        }
        if (node.child.length == 3) {
            blockStart = "for (const auto &[" + nodeToCppNode(depth, node.child[0]) + ", v_not_used" + "] : *" + nodeToCppNode(depth, node.child[1]) + ".map) "
            node.child.remove(0, 2)
            blockEnd = ""
        }
    }
    if (node.value == "if" || node.value == "while") {
        blockStart = node.value + " ("
        node.child[0].flags = (node.child[0].flags | NODE.NODE_FLAG_NO_BRACKETS)
        let block: string = nodeToCppNode(depth, node.child[0])
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
        blockStart = "(" + nodeToCppNode(depth, node.child[0]) + " ? " + nodeToCppNode(depth, node.child[1]) + " : " + nodeToCppNode(depth, node.child[2])
        blockEnd = ")"
        while (node.child.length > 0) {
            node.child.remove(0, 1)
        }
    }
    if (node.value == "print") {
        blockStart = "std::cout << "
        blockEnd = " << std::endl"
    }
    if (node.value == "!") {
        blockStart = "(!"
        blockEnd = ")"
    }
    if (node.value == ">>" || node.value == "<<" || node.value == "=" || node.value == "&&" || node.value == "||" || node.value == ">=" || node.value == "<=" || node.value == "<>" || node.value == "+" || node.value == "-" || node.value == "*" || node.value == "/" || node.value == "^" || node.value == "%" || node.value == "&" || node.value == "|" || node.value == "~" || node.value == "<" || node.value == ">") {
        if (node.value == "=") {
            node.value = "=="
        }
        if (node.value == "<>") {
            node.value = "!="
        }
        if (!(node.flags & NODE.NODE_FLAG_NO_BRACKETS)) {
            blockStart = "("
            blockEnd = ")"
        }
        if (node.value == "<<" && node.child[0].typeNode.value == "str") {
            blockStart = ""
            blockEnd = ""
            node.value = "+="
        }
        node.child.insert(1, NODE.New(node.value))
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
        let indentDepth: int = (indentNeeded ? depth : (depth - 1))
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
            for (let i: int = 0; i < (indentDepth - 1); i += 1) {
                s += indent
            }
        }
        let child: string = nodeToCppNode(indentDepth, nodeChild)
        s += child
        if ((node.value == "" ||
            node.value == "root" ||
            node.value == "module" ||
            node.value == "@if" ||
            node.value == "func" ||
            node.value == "struct" ||
            node.value == "do" ||
            node.value == "then" ||
            node.value == "else") &&
            (nodeChild.value == "let" ||
                nodeChild.value == "set" || 
                nodeChild.value == "<<" || 
                nodeChild.value == "call" || 
                nodeChild.value == "print" || 
                nodeChild.value == "break" || 
                nodeChild.value == "return" || 
                nodeChild.value == "insert" || 
                nodeChild.value == "remove" || 
                nodeChild.value == "push" ||
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

function nodeToCpp(node: NODE.Node): string {
    return nodeToCppNode(0, node)
}

function nodeToCppNoRefSet(node: NODE.Node) {
    node.flags = (node.flags | NODE.NODE_FLAG_NO_REF)
    for (let i: int = 0; i < node.child.length; i += 1) {
        nodeToCppNoRefSet(node.child[i])
    }
}

function nodeToCppNoRef(node: NODE.Node): string {
    nodeToCppNoRefSet(node)
    return nodeToCppNode(0, node)
}