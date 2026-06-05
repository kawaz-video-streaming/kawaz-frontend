import { Capacitor } from '@capacitor/core';
import { isTV, isNative } from '../../lib/platform';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Sun, Moon, LogOut, UserCircle2, Users, Loader2, UserPlus, Search, Database, Settings, ChevronDown, Upload, FolderPlus, Image, Tag, Mail, ArrowDownToLine } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { useTheme } from '../../theme/ThemeContext';
import { avatarImageUrl } from '../../api/avatar';
import { usePendingMedia } from '../../hooks/usePendingMedia';
import { usePendingUsers } from '../../hooks/usePendingUsers';
import { MediaProcessingPanel } from '../MediaProcessingPanel';
import { PendingSignupsPanel } from '../PendingSignupsPanel';
import { NavSearch } from '../NavSearch';

export const Navbar = () => {
  const { logout, isAdmin, username, selectedProfile, specialPool, toggleSpecialPool } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [processingOpen, setProcessingOpen] = useState(false);
  const [signupsOpen, setSignupsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef<HTMLDivElement>(null);
  const signupsRef = useRef<HTMLDivElement>(null);
  const { data: pendingItems } = usePendingMedia(isAdmin, processingOpen);
  const { data: pendingSignups } = usePendingUsers(isAdmin, signupsOpen);

  // Close avatar menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Close processing panel on outside click
  useEffect(() => {
    if (!processingOpen) return;
    const handler = (e: MouseEvent) => {
      if (processingRef.current && !processingRef.current.contains(e.target as Node)) {
        setProcessingOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [processingOpen]);

  // Close admin menu on outside click
  useEffect(() => {
    if (!adminMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [adminMenuOpen]);

  // Close signups panel on outside click
  useEffect(() => {
    if (!signupsOpen) return;
    const handler = (e: MouseEvent) => {
      if (signupsRef.current && !signupsRef.current.contains(e.target as Node)) {
        setSignupsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [signupsOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    void navigate('/login');
  };

  const handleChangeProfile = () => {
    setMenuOpen(false);
    void navigate('/profiles');
  };

  const handleAccountSettings = () => {
    setMenuOpen(false);
    void navigate('/account');
  };

  return (
    <nav className={`sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md${Capacitor.isNativePlatform() && !isTV ? ' portrait:pt-8' : ''}`}>
      <div className="flex items-center px-3 py-3 sm:px-6">
        {/* Left: Admin dropdown — flex-1 so center stays naturally centered */}
        <div className="flex flex-1 items-center">
          {isAdmin && (
            <div ref={adminMenuRef} className="relative hidden lg:block landscape:block">
              <button
                onClick={() => setAdminMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                Admin
                <ChevronDown size={14} className={`transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {adminMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-44 rounded-xl border border-border bg-card py-1 shadow-lg z-50">
                  <Link
                    to="/upload"
                    onClick={() => setAdminMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Upload size={15} />
                    Upload
                  </Link>
                  <Link
                    to="/collections/new"
                    onClick={() => setAdminMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <FolderPlus size={15} />
                    New Collection
                  </Link>
                  <Link
                    to="/admin/avatars"
                    onClick={() => setAdminMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Image size={15} />
                    Avatars
                  </Link>
                  <Link
                    to="/admin/genres"
                    onClick={() => setAdminMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Tag size={15} />
                    Genres
                  </Link>
                  <div className="my-1 border-t border-border" />
                  <Link
                    to="/admin/newsletter"
                    onClick={() => setAdminMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Mail size={15} />
                    Newsletter
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Kawaz+ Logo & Welcome Message */}
        <div className="flex shrink-0 flex-col items-center px-2">
          <Link to="/" className="text-lg font-extrabold tracking-tight whitespace-nowrap">
            Kawaz<span className="text-red-500">+</span>
          </Link>
          <p className="hidden max-w-[180px] truncate text-xs text-muted-foreground sm:block">
            Welcome back, <span className="font-semibold text-foreground">{selectedProfile?.name ?? username}</span>! 👋
          </p>
        </div>

        {/* Right: Theme Toggle + Processing + Search + Avatar Menu — flex-1 justified end */}
        <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Special pool toggle (admin only) — hidden on mobile, BottomNav handles it there */}
          {isAdmin && (
            <button
              onClick={toggleSpecialPool}
              className={`relative hidden lg:flex landscape:flex rounded-lg p-2 transition-colors hover:bg-accent ${specialPool ? 'text-purple-500' : 'text-muted-foreground hover:text-foreground'}`}
              aria-label={specialPool ? 'Switch to regular pool' : 'Switch to special pool'}
            >
              <Database size={16} />
              {specialPool && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-purple-500" />
              )}
            </button>
          )}

          {/* Processing panel (admin only) — hidden on mobile, BottomNav handles it there */}
          {isAdmin && (
            <div ref={processingRef} className="relative hidden lg:block landscape:block">
              <button
                onClick={() => setProcessingOpen((o) => !o)}
                className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Media processing status"
              >
                <Loader2 size={16} className={pendingItems && pendingItems.length > 0 ? 'animate-spin text-blue-500' : ''} />
                {pendingItems && pendingItems.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {pendingItems.length > 9 ? '9+' : pendingItems.length}
                  </span>
                )}
              </button>
              {processingOpen && <MediaProcessingPanel onClose={() => setProcessingOpen(false)} />}
            </div>
          )}

          {/* Pending signups panel (admin only) — hidden on mobile, BottomNav handles it there */}
          {isAdmin && (
            <div ref={signupsRef} className="relative hidden lg:block landscape:block">
              <button
                onClick={() => setSignupsOpen((o) => !o)}
                className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Pending signups"
              >
                <UserPlus size={16} />
                {pendingSignups && pendingSignups.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {pendingSignups.length > 9 ? '9+' : pendingSignups.length}
                  </span>
                )}
              </button>
              {signupsOpen && <PendingSignupsPanel onClose={() => setSignupsOpen(false)} />}
            </div>
          )}

          {isNative && !isTV && (
            <Link
              to="/downloads"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Downloads"
            >
              <ArrowDownToLine size={16} />
            </Link>
          )}

          <button
            onClick={() => {
              setSearchOpen(true);
              setMenuOpen(false);
              setProcessingOpen(false);
              setSignupsOpen(false);
            }}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Open search"
          >
            <Search size={16} />
          </button>

          <NavSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

          {/* Avatar button + dropdown */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-accent text-muted-foreground transition-colors hover:border-red-500/50 hover:text-foreground"
              aria-label="Account menu"
            >
              {selectedProfile ? (
                <img src={avatarImageUrl(selectedProfile.avatarId, isAdmin && specialPool)} alt={selectedProfile.name} className="h-full w-full object-cover" style={{ transform: 'translateZ(0)', imageRendering: 'auto' }} />
              ) : (
                <UserCircle2 size={18} />
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-border bg-card py-1 shadow-lg">
                <button
                  onClick={handleChangeProfile}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Users size={15} />
                  Change profile
                </button>
                <button
                  onClick={handleAccountSettings}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Settings size={15} />
                  Account settings
                </button>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-red-500"
                >
                  <LogOut size={15} />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
