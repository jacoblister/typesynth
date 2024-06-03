import * as NODE from "./node"

import * as TRANSFORM_PARSE from "./transform_parse"
import * as TRANSFORM_MODULE from "./transform_module"
import * as TRANSFORM_CLASS from "./transform_class"
import * as TRANSFORM_ARRAY from "./transform_array"

export { transformParse, transformModule, transformClass, transformArray }

function transformParse(node: NODE.Node): NODE.Node {
    return TRANSFORM_PARSE.transformParse(node)
}

function transformModule(node: NODE.Node): NODE.Node {
    return TRANSFORM_MODULE.transformModule(node)
}

function transformClass(node: NODE.Node): NODE.Node {
    return TRANSFORM_CLASS.transformClass(node)
}

function transformArray(node: NODE.Node): NODE.Node {
    return TRANSFORM_ARRAY.transformArray(node)
}