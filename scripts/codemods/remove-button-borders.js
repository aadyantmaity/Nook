/**
 * Codemod: remove-button-borders
 * - Removes borderWidth and borderColor from styles applied to TouchableOpacity and Pressable
 * - Handles inline style objects and StyleSheet.create objects referenced by those components
 */

const { parse } = require('recast');
const { default: traverse } = require('@babel/traverse');
const t = require('@babel/types');

const BUTTON_NAMES = new Set(['TouchableOpacity', 'Pressable', 'Button']);

function isTargetComponent(path) {
  if (!path || !path.node || !t.isJSXOpeningElement(path.node.openingElement)) return false;
  const name = path.node.openingElement.name;
  if (t.isJSXIdentifier(name)) return BUTTON_NAMES.has(name.name);
  if (t.isJSXMemberExpression(name)) return BUTTON_NAMES.has(name.property.name);
  return false;
}

function isStyleProp(attr) {
  return t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: 'style' });
}

function dropBorderPropsFromObjectExpression(objExpr) {
  if (!objExpr || !Array.isArray(objExpr.properties)) return;
  objExpr.properties = objExpr.properties.filter((prop) => {
    if (!t.isObjectProperty(prop) || !t.isIdentifier(prop.key)) return true;
    const key = prop.key.name;
    return key !== 'borderWidth' && key !== 'borderColor';
  });
}

function transformStyleAttribute(attrPath, state) {
  const attr = attrPath.node;
  if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name, { name: 'style' })) return;
  if (!attr.value) return;

  if (t.isJSXExpressionContainer(attr.value)) {
    const expr = attr.value.expression;
    if (t.isObjectExpression(expr)) {
      dropBorderPropsFromObjectExpression(expr);
      return;
    }
    if (t.isArrayExpression(expr)) {
      expr.elements.forEach((el) => {
        if (t.isObjectExpression(el)) dropBorderPropsFromObjectExpression(el);
      });
      return;
    }
    // If Identifier (StyleSheet ref), we will handle in StyleSheet pass globally
  }
}

function removeBordersFromReferencedStyleSheetObjects(ast) {
  // 1) Find all StyleSheet.create declarations and map object name -> map of style key -> object expression node
  const styleSheetObjects = new Map();
  traverse(ast, {
    VariableDeclarator(path) {
      const init = path.node.init;
      if (!init) return;
      if (
        t.isCallExpression(init) &&
        t.isMemberExpression(init.callee) &&
        t.isIdentifier(init.callee.object, { name: 'StyleSheet' }) &&
        t.isIdentifier(init.callee.property, { name: 'create' })
      ) {
        const arg = init.arguments && init.arguments[0];
        if (t.isObjectExpression(arg)) {
          const objName = t.isIdentifier(path.node.id) ? path.node.id.name : null;
          if (!objName) return;
          const keyToNode = new Map();
          arg.properties.forEach((prop) => {
            if (!t.isObjectProperty(prop)) return;
            const key = t.isIdentifier(prop.key) ? prop.key.name : (t.isStringLiteral(prop.key) ? prop.key.value : null);
            if (!key) return;
            if (t.isObjectExpression(prop.value)) keyToNode.set(key, prop.value);
          });
          styleSheetObjects.set(objName, keyToNode);
        }
      }
    },
  });

  // 2) Collect referenced style keys used on target components' style props
  const referenced = [];
  traverse(ast, {
    JSXElement(path) {
      if (!isTargetComponent(path)) return;
      const attrs = path.node.openingElement.attributes || [];
      attrs.forEach((attr) => {
        if (!isStyleProp(attr) || !attr.value || !t.isJSXExpressionContainer(attr.value)) return;
        const expr = attr.value.expression;
        const collectFromExpr = (e) => {
          if (t.isMemberExpression(e) && t.isIdentifier(e.object) && t.isIdentifier(e.property)) {
            // styles.someKey
            referenced.push({ obj: e.object.name, key: e.property.name });
          } else if (t.isIdentifier(e)) {
            // style variable pointing to styles.someKey defined elsewhere is hard; skip
          } else if (t.isArrayExpression(e)) {
            e.elements.forEach((el) => { if (el) collectFromExpr(el); });
          } else if (t.isConditionalExpression(e)) {
            collectFromExpr(e.consequent);
            collectFromExpr(e.alternate);
          } else if (t.isLogicalExpression(e)) {
            collectFromExpr(e.left);
            collectFromExpr(e.right);
          }
        };
        collectFromExpr(expr);
      });
    },
  });

  // 3) Drop border props only for referenced style objects
  referenced.forEach(({ obj, key }) => {
    const map = styleSheetObjects.get(obj);
    if (!map) return;
    const node = map.get(key);
    if (!node) return;
    dropBorderPropsFromObjectExpression(node);
  });
}

module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  // 1) Remove border props from style attributes on target components
  root.find(j.JSXElement)
    .filter((path) => isTargetComponent(path))
    .forEach((jsxPath) => {
      const opening = jsxPath.node.openingElement;
      opening.attributes.forEach((attr) => {
        if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: 'style' })) {
          // Use recast/babel direct transform for complex cases
        }
      });
    });

  // We must use recast AST traversal for complex nested forms
  const ast = parse(fileInfo.source, { parser: require('recast/parsers/babel') });
  traverse(ast, {
    JSXElement(path) {
      if (!isTargetComponent(path)) return;
      const attrs = path.node.openingElement.attributes || [];
      attrs.forEach((attr) => {
        if (isStyleProp(attr)) {
          transformStyleAttribute({ node: attr }, {});
        }
      });
    },
  });

  // 2) Remove from StyleSheet.create objects (only those referenced by target components)
  removeBordersFromReferencedStyleSheetObjects(ast);

  const recast = require('recast');
  const output = recast.print(ast).code;
  return output;
};
