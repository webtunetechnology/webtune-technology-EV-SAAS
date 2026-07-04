'use client';

import { useState, useEffect } from 'react';
import { Search, Bell, User, Settings, LogOut, ChevronDown, Leaf, Menu, X, Calendar, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface HeaderProps {
  activeSection?: string;
  onMenuClick?: () => void;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  mobile_number: string;
}

interface ShowroomData {
  id: string;
  showroom_name: string;
  logo_url?: string;
}

export function Header({ activeSection = 'dashboard', onMenuClick }: HeaderProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [showroom, setShowroom] = useState<ShowroomData | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
      setCurrentDate(now.toLocaleDateString('en-US', options));
    };
    updateDate();

    fetchUserData();
  }, []);

  // Function to get logo from various sources
  const getLogoFromStorage = (): string | null => {
    // Check localStorage first
    const localStorageLogo = localStorage.getItem('showroom_logo');
    if (localStorageLogo && localStorageLogo !== 'null' && localStorageLogo !== 'undefined') {
      return localStorageLogo;
    }
    
    // Check sessionStorage
    const sessionStorageLogo = sessionStorage.getItem('showroom_logo');
    if (sessionStorageLogo && sessionStorageLogo !== 'null' && sessionStorageLogo !== 'undefined') {
      return sessionStorageLogo;
    }
    
    // Check cookies
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'showroom_logo' && value && value !== 'null' && value !== 'undefined') {
        return decodeURIComponent(value);
      }
    }
    
    return null;
  };

  async function fetchUserData() {
    try {
      // Get logo from storage
      const storedLogo = getLogoFromStorage();
      if (storedLogo) {
        setLogoUrl(storedLogo);
      }
      
      // Get user data from localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          setUser(userData);
        } catch (e) {
          console.error('Error parsing user:', e);
        }
      }

      // Get showroom data from localStorage
      const showroomStr = localStorage.getItem('showroom');
      if (showroomStr) {
        try {
          const showroomData = JSON.parse(showroomStr);
          setShowroom(showroomData);
          
          // If logo is in showroom data, use it
          if (showroomData.logo_url) {
            setLogoUrl(showroomData.logo_url);
            // Save to storage for future use
            localStorage.setItem('showroom_logo', showroomData.logo_url);
            sessionStorage.setItem('showroom_logo', showroomData.logo_url);
          }
        } catch (e) {
          console.error('Error parsing showroom:', e);
        }
      } else {
        // Try to get showroom data from cookies
        const cookieShowroomId = document.cookie.split(';').find(c => c.trim().startsWith('showroom_id='));
        if (cookieShowroomId) {
          const showroomId = cookieShowroomId.split('=')[1];
          const cookieShowroomName = document.cookie.split(';').find(c => c.trim().startsWith('showroom_name='));
          if (cookieShowroomName) {
            const showroomName = cookieShowroomName.split('=')[1];
            setShowroom({
              id: showroomId,
              showroom_name: decodeURIComponent(showroomName)
            });
          }
        }
      }
      
      // If we have showroom ID but no logo, try to fetch from database
      if (showroom?.id && !logoUrl) {
        const { data: brandingData, error: brandingError } = await supabase
          .from('showroom_branding')
          .select('logo_url')
          .eq('showroom_id', showroom.id)
          .single();
        
        if (!brandingError && brandingData?.logo_url) {
          setLogoUrl(brandingData.logo_url);
          // Store for future use
          localStorage.setItem('showroom_logo', brandingData.logo_url);
          sessionStorage.setItem('showroom_logo', brandingData.logo_url);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'dashboard':
        return 'Dashboard';
      case 'customer':
        return 'Customers';
      case 'vehicle':
        return 'Vehicles';
      case 'inventory':
        return 'Inventory';
      case 'invoice':
        return 'Invoices';
      case 'service':
        return 'Service';
      case 'stock':
        return 'Stock';
      default:
        return 'Dashboard';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('showroom');
    localStorage.removeItem('user_logged_in');
    localStorage.removeItem('showroom_logo');
    sessionStorage.removeItem('showroom_logo');

    const cookies = ['user_id', 'user_name', 'user_email', 'user_role', 'showroom_id', 'showroom_name', 'user_logged_in', 'showroom_logo'];
    cookies.forEach(cookie => {
      document.cookie = `${cookie}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    });

    window.location.href = '/login';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
      // Implement search functionality here
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 lg:px-8 sticky top-0 z-40 shadow-sm">
        {/* Left Section */}
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          {/* Mobile Menu Button */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {/* Desktop Title */}
          <div className="hidden lg:block min-w-0">
            <h2 className="text-xl text-gray-800 font-semibold truncate">
              {getSectionTitle()}
            </h2>
            <div className="flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 text-green-600" />
              <p className="text-xs text-gray-500">{currentDate}</p>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile Date */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg">
              <Calendar className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-600">{currentDate}</span>
            </div>
          </div>

          {/* Mobile Search Toggle */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Search className="w-5 h-5 text-gray-600" />
          </button>

          {/* Desktop Search Bar */}
          <form onSubmit={handleSearch} className="hidden lg:block relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-80 pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
          </form>

          {/* Notifications */}
          <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
          </button>

          {/* Settings */}
          <a
            href="/dashboard/profile"
            className="hidden sm:block p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </a>

          {/* User Profile Dropdown with Showroom Logo */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 md:pl-3 border-l border-gray-200 hover:bg-gray-50 rounded-lg transition-colors py-1 pr-1 md:pr-2"
            >
              <div className="text-right hidden xs:block">
                <div className="text-sm text-gray-800 font-medium truncate max-w-[120px]">
                  {showroom?.showroom_name?.split(' ')[0] || 'Showroom'}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {user?.role || 'Admin'}
                </div>
              </div>
              
              {/* Profile Icon with Showroom Logo */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm overflow-hidden bg-gradient-to-br from-green-500 to-green-600">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={showroom?.showroom_name || 'Showroom Logo'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // If image fails to load, fallback to user icon
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.style.background = 'linear-gradient(135deg, #00C853, #00E676)';
                        const icon = document.createElement('div');
                        icon.className = 'w-full h-full flex items-center justify-center';
                        icon.innerHTML = '<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>';
                        parent.appendChild(icon);
                      }
                    }}
                  />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <ChevronDown className="w-3 h-3 text-gray-500 hidden xs:block" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center gap-3">
                      {/* Larger logo in dropdown */}
                      <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm overflow-hidden bg-gradient-to-br from-green-500 to-green-600 flex-shrink-0">
                        {logoUrl ? (
                          <img 
                            src={logoUrl} 
                            alt={showroom?.showroom_name || 'Showroom Logo'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.style.background = 'linear-gradient(135deg, #00C853, #00E676)';
                                const icon = document.createElement('div');
                                icon.className = 'w-full h-full flex items-center justify-center';
                                icon.innerHTML = '<svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>';
                                parent.appendChild(icon);
                              }
                            }}
                          />
                        ) : (
                          <Store className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-800 truncate">
                          {showroom?.showroom_name || 'EV Showroom'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {user?.email || 'showroom@example.com'}
                        </div>
                        <div className="text-xs text-green-600 font-medium mt-0.5 capitalize">
                          {user?.role || 'Admin'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <a
                      href="/dashboard/profile"
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span>My Profile</span>
                    </a>
                    <a
                      href="/dashboard/profile"
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </a>
                    <div className="border-t border-gray-200 my-2"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Search Bar */}
      {showMobileSearch && (
        <div className="lg:hidden fixed top-16 left-0 right-0 bg-white border-b border-gray-200 p-3 z-40 shadow-md">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowMobileSearch(false)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </form>
        </div>
      )}

      <style jsx>{`
        @media (min-width: 480px) {
          .xs\\:block {
            display: block;
          }
        }
      `}</style>
    </>
  );
}
