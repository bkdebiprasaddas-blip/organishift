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
  rowClassName = () => 'bg-slate-50 hover:bg-indigo-50/40',
  renderMain,
  renderActions,
  renderCollapsed,
  childrenWrap = 'ml-[11px] space-y-1 border-l border-slate-200 pl-5'
}) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <div className="space-y-1">
      {nodes.map(node => {
        const id = keyOf(node);
        const kids = node.children || [];
        const hasKids = kids.length > 0;
        const col = isCollapsed(node);

        return (
          <div key={id} className="space-y-1">
            <div className={`group relative flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-slate-200 px-3 py-2 ${rowClassName(node, hasKids)}`}>
              <div className="flex min-w-0 items-center gap-2">
                {hasKids ? (
                  <button
                    type="button"
                    onClick={() => onToggle(id)}
                    aria-expanded={!col}
                    aria-label={col ? 'Expand' : 'Collapse'}
                    className="shrink-0 rounded p-0.5 text-slate-500 transition hover:bg-white hover:text-indigo-600"
                  >
                    {col ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                ) : (
                  <span className="w-[22px] shrink-0" />
                )}
                {renderMain(node, { hasKids })}
              </div>
              {renderActions && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {renderActions(node, { hasKids })}
                </div>
              )}
            </div>

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
