import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Shared TreeView (T-018 / UI-SPEC §3) — ONE recursion engine for all three
 * contexts (Library / Plan builder / Event execution).
 *
 * Props:
 *  nodes          array of nodes with children: []
 *  keyOf          node -> unique key (default _id || id)
 *  isCollapsed    node -> bool
 *  onToggle       nodeId => void
 *  rowClassName   (node, hasKids) => classes for the row shell
 *  renderMain     (node, { hasKids }) => left-side content (icon/title/meta)
 *  renderActions  (node, { hasKids }) => right-side content (optional)
 *  renderCollapsed(node) => JSX shown in place of children when collapsed
 *  childrenWrap   classes for the children container
 */
export default function TreeView({
  nodes,
  keyOf = n => n._id ?? n.id,
  isCollapsed = () => false,
  onToggle = () => {},
  rowClassName = () => 'bg-white hover:bg-slate-50',
  renderMain,
  renderActions,
  renderSubRow,
  renderCollapsed,
  childrenWrap = 'ml-5 pl-4 border-l-2 border-indigo-100/80 space-y-1.5 pt-1.5'
}) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {nodes.map((node, index) => {
        const id = keyOf(node);
        const kids = node.children || [];
        const hasKids = kids.length > 0;
        const col = isCollapsed(node);
        const isLast = index === nodes.length - 1;

        return (
          <div key={id} className="relative space-y-1">
            <div className={`group/row relative flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-slate-200/90 px-3.5 py-2.5 shadow-xs transition-all duration-150 ${rowClassName(node, hasKids)}`}>
              <div className="flex min-w-0 items-center gap-2 flex-1">
                {hasKids ? (
                  <button
                    type="button"
                    onClick={() => onToggle(id)}
                    aria-expanded={!col}
                    aria-label={col ? 'Expand' : 'Collapse'}
                    className="shrink-0 rounded-md p-1 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
                  >
                    {col ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-400 transition" />
                  </span>
                )}
                {renderMain(node, { hasKids })}
              </div>
              {renderActions && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {renderActions(node, { hasKids })}
                </div>
              )}
            </div>

            {renderSubRow && renderSubRow(node, { hasKids })}

            {hasKids && !col && (
              <div className={childrenWrap}>
                <TreeView
                  nodes={kids}
                  keyOf={keyOf}
                  isCollapsed={isCollapsed}
                  onToggle={onToggle}
                  rowClassName={rowClassName}
                  renderMain={renderMain}
                  renderActions={renderActions}
                  renderSubRow={renderSubRow}
                  renderCollapsed={renderCollapsed}
                  childrenWrap={childrenWrap}
                />
              </div>
            )}

            {hasKids && col && renderCollapsed && renderCollapsed(node)}
          </div>
        );
      })}
    </div>
  );
}
