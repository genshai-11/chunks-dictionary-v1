import { useState } from "react";
import { Book, Bookmark, Sparkles, User, LogOut, Search, X, Settings, Users } from "lucide-react";
import { DictionaryEntry, ChunkColor } from "../types";

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isTeacher: boolean;
  onLogout: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  entries: DictionaryEntry[];
}

export default function Navigation({ 
  activeTab, 
  setActiveTab, 
  isTeacher, 
  onLogout,
  searchTerm,
  setSearchTerm,
  entries
}: NavigationProps) {
  const [isFocused, setIsFocused] = useState(false);
  const isDashboardView = ["teacher-dashboard", "teacher-editor"].includes(activeTab);

  if (isDashboardView) {
    return (
      <header 
        className="sticky top-0 z-40 bg-neutral-900 border-b border-neutral-800 text-white shadow-sm font-sans"
        id="global-header-navigation-admin"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div 
              onClick={() => setActiveTab("search")}
              className="flex items-center gap-2 cursor-pointer group shrink-0"
              id="brand-logo-clickable"
            >
              <span className="text-xl md:text-2xl font-black tracking-wider text-white transition-all group-hover:text-red-400 font-sans">
                CHUNKS
              </span>
            </div>
            <div className="h-4 w-[1px] bg-neutral-700 hidden sm:block" />
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-650/20 text-red-400 border border-red-500/20 text-[10px] font-extrabold uppercase tracking-widest leading-none">
              ADMIN WORKSPACE
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-neutral-800 p-1 rounded-full items-center mr-2">
              <button
                onClick={() => setActiveTab("search")}
                className="px-4 py-1.5 rounded-full text-xs font-bold transition-all bg-neutral-700 text-white shadow-sm flex items-center gap-1.5"
              >
                Học tập
              </button>
              <button
                className="px-4 py-1.5 rounded-full text-xs font-bold transition-all bg-white text-neutral-900 shadow-sm flex items-center gap-1.5 cursor-default"
              >
                Giáo viên
              </button>
            </div>

            {isTeacher && (
              <button
                id="nav-btn-logout-admin"
                onClick={onLogout}
                className="px-3 py-1.5 text-neutral-400 hover:text-red-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer rounded-lg hover:bg-neutral-800 transition-colors font-sans"
                title="Đăng xuất giáo viên"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            )}
          </div>
        </div>
      </header>
    );
  }

  const showAdminTabs = [
    "settings",
    "teacher",
    "teacher-dashboard",
    "teacher-editor"
  ].includes(activeTab);

  const tabs = [
    { id: "search", label: "Tra cứu", icon: Book },
    { id: "saved", label: "Đã lưu", icon: Bookmark },
    { id: "classroom", label: "Lớp học", icon: Users },
    ...(showAdminTabs ? [
      { id: "teacher", label: isTeacher ? "Ban biên soạn" : "Giáo viên", icon: User }
    ] : [])
  ];

  return (
    <header 
      className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-xs"
      id="global-header-navigation"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand logo matching header theme */}
        <div 
          onClick={() => setActiveTab("search")}
          className="flex items-center gap-2 cursor-pointer group shrink-0"
          id="brand-logo-clickable"
        >
          <span className="text-xl md:text-2xl font-black tracking-wider text-neutral-900 transition-all group-hover:text-red-600 font-sans">
            CHUNKS
          </span>
        </div>

        {/* Header Search Bar */}
        <div className="hidden sm:flex items-center flex-1 max-w-[180px] md:max-w-xs relative animate-fade-in" id="header-search-input-container">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3" />
          <input
            id="header-search-input"
            type="text"
            value={searchTerm}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onChange={(e) => {
              const val = e.target.value;
              setSearchTerm(val);
              if (activeTab !== "search" && !activeTab.startsWith("detail-")) {
                setActiveTab("search");
              }
            }}
            placeholder="Tra từ nhanh..."
            className="w-full pl-9 pr-8 py-1.5 bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200 rounded-lg text-xs font-sans text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 p-0.5 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Floating matched search suggestions component (dropdown format) */}
          {isFocused && searchTerm.trim() !== "" && (() => {
            const categoryColors: Record<ChunkColor, { dot: string; label: string }> = {
              green: { dot: "bg-emerald-500", label: "Từ nối" },
              blue: { dot: "bg-blue-500", label: "Khung câu" },
              red: { dot: "bg-red-500", label: "Thành ngữ" },
              pink: { dot: "bg-pink-500", label: "Từ khóa" },
            };

            const matchedSuggestions = entries.filter(e => {
              return e.vn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     e.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     (e.tags && e.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
            }).slice(0, 7);

            return (
              <div 
                className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-72 overflow-y-auto z-50 divide-y divide-neutral-100 animate-fade-in font-sans"
                id="header-search-dropdown-results"
              >
                {matchedSuggestions.length > 0 ? (
                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-neutral-400 font-bold bg-neutral-50/50">
                      Gợi ý cụm từ ({matchedSuggestions.length})
                    </div>
                    {matchedSuggestions.map((item) => {
                      const colorMeta = categoryColors[item.color] || { dot: "bg-neutral-400", label: "Cụm từ" };
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={() => {
                            setActiveTab(`detail-${item.id}`);
                            setSearchTerm("");
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex flex-col gap-0.5 cursor-pointer group transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-neutral-800 text-xs truncate group-hover:text-red-650 transition-colors">
                              {item.vn}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colorMeta.dot}`} title={colorMeta.label} />
                          </div>
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className="text-neutral-500 text-[11px] font-sans truncate font-medium">
                              {item.en}
                            </span>
                            {item.ipa && (
                              <span className="text-neutral-400 text-[9px] font-mono shrink-0">
                                {item.ipa}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-neutral-400 font-sans text-xs">
                    Không tìm thấy từ khớp
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Navigation Tabs List */}
        <nav className="flex items-center gap-1 md:gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id || (tab.id === "teacher" && activeTab.startsWith("teacher"));
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all focus:outline-none cursor-pointer ${
                  isActive
                    ? "bg-red-50 text-red-700"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-red-600" : "text-neutral-400"}`} />
                <span className="hidden md:inline font-sans font-semibold">{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-red-600 rounded-full" />
                )}
              </button>
            );
          })}

          {isTeacher && (
            <div className="hidden lg:flex bg-neutral-100 p-1 rounded-full items-center ml-2 border border-neutral-200">
              <button
                className="px-4 py-1 rounded-full text-xs font-bold transition-all bg-white text-neutral-900 shadow-sm flex items-center gap-1.5 cursor-default"
              >
                Học tập
              </button>
              <button
                onClick={() => setActiveTab("teacher-dashboard")}
                className="px-4 py-1 rounded-full text-xs font-bold transition-all text-neutral-500 hover:bg-neutral-200 flex items-center gap-1.5 cursor-pointer"
              >
                Giáo viên
              </button>
            </div>
          )}

          {/* Teacher Logout button if verified */}
          {isTeacher && (
            <button
              id="nav-btn-logout"
              onClick={onLogout}
              className="ml-2 px-3 py-2 text-xs font-semibold text-neutral-500 hover:text-red-700 hover:bg-red-50 rounded-lg flex items-center gap-1.5 cursor-pointer truncate"
              title="Đăng xuất giáo viên"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-xs">Thoát</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
