import React from "react";

// Attach application state and actions to the reference component's own nodes.
export function wire(node, props = {}) {
  if (!React.isValidElement(node)) return node;
  const id = node.props["data-node-id"];
  const name = node.props["data-name"] || "";
  const patch = props.patches?.[id] || {};
  if (patch.hidden) return null;
  const { hidden, text, children: replacement, append, ...attributes } = patch;
  const action =
    props.actions?.[id] ||
    (name.startsWith("tab/") && props.navigate
      ? { onClick: () => props.navigate(name.slice(4)), label: name.slice(4) }
      : null);
  let children =
    replacement !== undefined
      ? replacement
      : text !== undefined
        ? text
        : React.Children.map(node.props.children, (child) =>
            wire(child, props),
          );
  if (append)
    children = [
      ...React.Children.toArray(children),
      ...React.Children.toArray(append),
    ];
  let type = node.type;
  const next = { ...attributes };
  if (patch.style) next.style = { ...node.props.style, ...patch.style };
  if (action) {
    type = "button";
    next.type = "button";
    next.onClick = (event) => {
      event.stopPropagation();
      action.onClick(event);
    };
    next["aria-label"] = action.label || name;
    if (action.pressed !== undefined) next["aria-pressed"] = action.pressed;
    if (action.checked !== undefined) {
      next.role = "switch";
      next["aria-checked"] = action.checked;
    }
  } else if (type === "a") type = "div";
  return React.createElement(type, { ...node.props, ...next }, children);
}
