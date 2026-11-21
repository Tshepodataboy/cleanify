export type ActiveTab = 'map' | 'board' | 'impact';

interface TopNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenReportModal: () => void;
}

export function TopNav({ activeTab, onSelectTab, onOpenReportModal }: TopNavProps) {
  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'map', label: 'Map & Spots' },
    { id: 'board', label: 'Community Board' },
    { id: 'impact', label: 'Impact Log' },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-8 shrink-0 z-30">
      {/* Zone 1: Single-line brand wordmark */}
      <button
        type="button"
        onClick={() => onSelectTab('map')}
        className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
      >
        CleanCommons
      </button>

      {/* Zone 2: Concise single-line navigation links */}
      <nav aria-label="Primary" className="flex items-center gap-6 sm:gap-8 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`relative py-5 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                isActive
                  ? 'text-slate-900'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-700"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Single primary action button */}
      <div className="shrink-0">
        <button
          type="button"
          onClick={onOpenReportModal}
          className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Report Spot
        </button>
      </div>
    </header>
  );
}
