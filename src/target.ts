import * as NODE from "./node"

import * as TARGET_JS from "./target_js"
import * as TARGET_CPP from "./target_cpp"
import * as TARGET_C from "./target_c"

export { js, ts, cpp, cppNoRef, c }

function js(node: NODE.Node): string {
    return TARGET_JS.nodeToJs(node)
}

function ts(node: NODE.Node): string {
    return TARGET_JS.nodeToTs(node)
}

function cpp(node: NODE.Node): string {
    return TARGET_CPP.nodeToCpp(node)
}

function cppNoRef(node: NODE.Node): string {
    return TARGET_CPP.nodeToCppNoRef(node)
}

function c(node: NODE.Node): string {
    return TARGET_C.nodeToC(node)
}
