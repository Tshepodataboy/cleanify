import { LogIn, LogOut, UserCheck } from 'lucide-react';
import type { AuthUser } from '../types';

export type ActiveTab = 'board' | 'map' | 'impact';

interface TopNavProps {
  activeTab: ActiveTab;
  currentUser: AuthUser | null;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenReportModal: () => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export function TopNav({
  activeTab,
  currentUser,
  onSelectTab,
  onOpenReportModal,
  onOpenAuthModal,
  onLogout,
}: TopNavProps) {
  const navItems: { id: ActiveTab; label: string; mobileLabel: string }[] = [
    { id: 'board', label: 'Community Board', mobileLabel: 'Board' },
    { id: 'map', label: 'Map & Spots', mobileLabel: 'Map & Spots' },
    { id: 'impact', label: 'Impact Log', mobileLabel: 'Impact Log' },
  ];

  return (
    <header className="bg-[#3D634A] text-white border-b border-white/15 shrink-0 z-30">
      <div className="h-14 md:h-16 px-4 sm:px-6 flex items-center justify-between gap-3 md:gap-8">
        {/* Zone 1: Single-line brand wordmark (returns to Community Board home) */}
        <button
          type="button"
          onClick={() => onSelectTab('board')}
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E9E8B8]"
        >
          CleanCommons
        </button>

        {/* Zone 2 (Desktop): Concise single-line navigation links */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-5 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E9E8B8] ${
                  isActive ? 'text-[#F2F0C9]' : 'text-white/75 hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-[#E9E8B8]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Account Access & Report Spot */}
        <div className="flex items-center gap-2 shrink-0">
          {currentUser ? (
            <div className="flex items-center gap-1.5 bg-[#32523D] border border-white/15 rounded-lg pl-2.5 pr-1.5 py-1">
              <UserCheck className="w-3.5 h-3.5 text-[#EAE8BA] shrink-0" aria-hidden="true" />
              <span className="text-xs font-medium text-[#F2F0C9] max-w-[96px] sm:max-w-[140px] truncate">
                {currentUser.displayName}
              </span>
              <button
                type="button"
                onClick={onLogout}
                title="Sign out"
                aria-label="Sign out"
                className="p-1 text-white/75 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-semibold text-white bg-white/15 hover:bg-white/25 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E9E8B8]"
            >
              <LogIn className="w-3.5 h-3.5 text-[#EAE8BA]" aria-hidden="true" />
              <span>Sign In</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenReportModal}
            className="px-3 py-2 md:px-4 text-xs md:text-sm font-semibold text-[#24412E] bg-[#EAE8BA] hover:bg-[#F3F2D0] active:bg-[#DFDDA7] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Report Spot
          </button>
        </div>
      </div>

      {/* Mobile Secondary Tab Bar (< md) */}
      <nav
        aria-label="Mobile Primary"
        className="md:hidden grid grid-cols-3 border-t border-white/15 bg-[#365942]"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`relative py-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                isActive ? 'text-[#F2F0C9]' : 'text-white/75 hover:text-white'
              }`}
            >
              {item.mobileLabel}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-4 bottom-0 h-0.5 bg-[#E9E8B8] rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
