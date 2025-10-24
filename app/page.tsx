"use client";
import React, { useState, useEffect, useRef } from "react";

interface Tab {
  id: number;
  name: string;
  content: string;
  history: string[];
  historyIndex: number;
}

export default function Home() {
  const [tabs, setTabs] = useState<Tab[]>([{ id: 1, name: "Document 1", content: "", history: [""], historyIndex: 0 }]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [notification, setNotification] = useState<{message: string, type: "info"|"success"|"warning"} | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [nextTabId, setNextTabId] = useState(2);
  const [editingTabId, setEditingTabId] = useState<number | null>(null);
  const [editingTabName, setEditingTabName] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabNameInputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const text = activeTab.content;
  const history = activeTab.history;
  const historyIndex = activeTab.historyIndex;

  // Load saved data on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('texter-dark-mode');
    const savedFontSize = localStorage.getItem('texter-font-size');
    const savedTabs = localStorage.getItem('texter-tabs');
    const savedActiveTabId = localStorage.getItem('texter-active-tab-id');
    const savedNextTabId = localStorage.getItem('texter-next-tab-id');

    if (savedFontSize) setFontSize(parseInt(savedFontSize, 10));

    if (savedTabs) {
      try {
        const parsedTabs = JSON.parse(savedTabs);
        if (parsedTabs.length > 0) {
          setTabs(parsedTabs);
          if (savedActiveTabId) {
            const activeId = parseInt(savedActiveTabId, 10);
            if (parsedTabs.find((t: Tab) => t.id === activeId)) {
              setActiveTabId(activeId);
            }
          }
          if (savedNextTabId) {
            setNextTabId(parseInt(savedNextTabId, 10));
          }
        }
      } catch (e) {
        console.error('Failed to load tabs from localStorage:', e);
      }
    }

    const isDark = savedDarkMode === 'true' || (!savedDarkMode && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('texter-tabs', JSON.stringify(tabs));
    localStorage.setItem('texter-active-tab-id', String(activeTabId));
    localStorage.setItem('texter-next-tab-id', String(nextTabId));
  }, [tabs, activeTabId, nextTabId]);

  const showNotification = (message: string, type: "info"|"success"|"warning") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const updateActiveTab = (updates: Partial<Tab>) => {
    setTabs(tabs.map(tab => tab.id === activeTabId ? { ...tab, ...updates } : tab));
  };

  const createNewTab = () => {
    const newTab: Tab = {
      id: nextTabId,
      name: `Document ${nextTabId}`,
      content: "",
      history: [""],
      historyIndex: 0
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(nextTabId);
    setNextTabId(nextTabId + 1);
    showNotification("New tab created", "success");
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const closeTab = (tabId: number) => {
    if (tabs.length === 1) {
      showNotification("Cannot close last tab", "warning");
      return;
    }
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.content.trim() && !confirm("Close tab? Unsaved changes will be lost.")) return;
    
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
    showNotification("Tab closed", "info");
  };

  const startEditingTabName = (tabId: number, currentName: string) => {
    setEditingTabId(tabId);
    setEditingTabName(currentName);
    setTimeout(() => tabNameInputRef.current?.select(), 0);
  };

  const finishEditingTabName = () => {
    if (editingTabId && editingTabName.trim()) {
      setTabs(tabs.map(tab => tab.id === editingTabId ? { ...tab, name: editingTabName.trim() } : tab));
      showNotification("Tab renamed", "success");
    }
    setEditingTabId(null);
    setEditingTabName("");
  };

  const cancelEditingTabName = () => {
    setEditingTabId(null);
    setEditingTabName("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "text/plain" && !file.name.endsWith('.txt')) {
      showNotification("Only .txt files supported", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      updateActiveTab({ content, history: [content], historyIndex: 0, name: file.name.replace('.txt', '') });
      showNotification(`Loaded: ${file.name}`, "success");
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const newHistory = history.slice(0, historyIndex + 1);
    if (newHistory[newHistory.length - 1] !== newText) {
      newHistory.push(newText);
      updateActiveTab({ content: newText, history: newHistory, historyIndex: newHistory.length - 1 });
    } else {
      updateActiveTab({ content: newText });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "s": e.preventDefault(); handleDownload(); return;
        case "t": e.preventDefault(); createNewTab(); return;
        case "w": e.preventDefault(); closeTab(activeTabId); return;
        case "d": e.preventDefault(); toggleDarkMode(); return;
        case "z": e.preventDefault(); handleUndo(); return;
        case "y": e.preventDefault(); handleRedo(); return;
        case "=":
        case "+": e.preventDefault(); handleFontSizeChange(1); return;
        case "-": e.preventDefault(); handleFontSizeChange(-1); return;
      }
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = text.substring(0, start) + "    " + text.substring(end);
      updateActiveTab({ content: newText });
      setTimeout(() => {
        if (textarea) {
          textarea.selectionStart = textarea.selectionEnd = start + 4;
        }
      }, 0);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      updateActiveTab({ historyIndex: newIndex, content: history[newIndex] });
      showNotification("Undo", "info");
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      updateActiveTab({ historyIndex: newIndex, content: history[newIndex] });
      showNotification("Redo", "info");
    }
  };

  const handleDownload = () => {
    if (!text.trim()) {
      showNotification("Nothing to save", "warning");
      return;
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}_${String(date.getHours()).padStart(2,'0')}-${String(date.getMinutes()).padStart(2,'0')}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `text_${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("File saved", "success");
  };

  const getTextStats = () => {
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lineCount = text.split("\n").length;
    const charCount = text.length;
    const mins = Math.floor(wordCount / 225);
    const readingTime = wordCount / 225 < 1 ? `${Math.ceil((wordCount/225)*60)}s` : `${mins}m`;
    return { wordCount, lineCount, charCount, readingTime };
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('texter-dark-mode', String(newDarkMode));
    document.documentElement.classList.toggle('dark', newDarkMode);
    showNotification(`${newDarkMode ? 'Dark' : 'Light'} mode`, "info");
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(10, Math.min(32, fontSize + delta));
    setFontSize(newSize);
    localStorage.setItem('texter-font-size', String(newSize));
    showNotification(`Font size: ${newSize}px`, "info");
  };

  const getCursorPosition = () => {
    if (!textareaRef.current) return { line: 1, col: 1 };
    const textBeforeCursor = text.substring(0, textareaRef.current.selectionStart);
    const lines = textBeforeCursor.split('\n');
    return { line: lines.length, col: lines[lines.length - 1].length + 1 };
  };

  const stats = getTextStats();
  const cursorPos = getCursorPosition();

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Top Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-3 px-6 flex justify-between items-center">
        <h1 className="text-gray-800 dark:text-gray-100 text-xl font-bold flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Texter
        </h1>
        <div className="flex gap-2 items-center">
          <button onClick={() => fileInputRef.current?.click()} className="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium py-2 px-3 rounded-md transition-colors border border-gray-300 dark:border-gray-600 text-sm" title="Open file">Open</button>
          <button onClick={handleDownload} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-3 rounded-md transition-colors shadow-sm text-sm" title="Save (Ctrl+S)">Save</button>
          <div className="relative group">
            <button className="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium py-2 px-3 rounded-md transition-colors border border-gray-300 dark:border-gray-600">⚙️</button>
            <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 border border-gray-200 dark:border-gray-700">
              <div className="p-2">
                <button onClick={toggleDarkMode} className="w-full text-left px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-800 dark:text-gray-200 text-sm">{darkMode ? '☀️ Light mode' : '🌙 Dark mode'}</button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                <div className="px-3 py-2">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Font size: {fontSize}px</div>
                  <div className="flex gap-2">
                    <button onClick={() => handleFontSizeChange(-1)} className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm">-</button>
                    <button onClick={() => handleFontSizeChange(1)} className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm">+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area with sidebar and editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with tabs */}
        <div className="w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">

        {/* New Tab Button */}
        <div className="p-2">
          <button onClick={createNewTab} className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors" title="New Tab (Ctrl+T)">
            <span className="text-xl">+</span> New Tab
          </button>
        </div>

        {/* Tabs List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {tabs.map(tab => (
            <div key={tab.id} className={`group flex items-center justify-between p-2 rounded-md transition-colors ${activeTabId === tab.id ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
              {editingTabId === tab.id ? (
                <input
                  ref={tabNameInputRef}
                  type="text"
                  value={editingTabName}
                  onChange={(e) => setEditingTabName(e.target.value)}
                  onBlur={finishEditingTabName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') finishEditingTabName();
                    if (e.key === 'Escape') cancelEditingTabName();
                  }}
                  className="flex-1 px-2 py-1 text-sm font-medium bg-white dark:bg-gray-700 border border-indigo-500 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div 
                  onClick={() => setActiveTabId(tab.id)}
                  onDoubleClick={() => startEditingTabName(tab.id, tab.name)}
                  className="flex-1 truncate text-sm font-medium cursor-pointer"
                  title="Double-click to rename"
                >
                  {tab.name}
                </div>
              )}
              {editingTabId !== tab.id && (
                <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }} className="opacity-0 group-hover:opacity-100 ml-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-opacity" title="Close (Ctrl+W)">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

        {/* Main content - Editor area */}
        <div className="flex-1 p-6 overflow-auto bg-gray-50 dark:bg-gray-900">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-3 px-2">
              <div className="flex gap-4">
                <div>{stats.charCount} characters</div>
                <div>{stats.wordCount} words</div>
                <div>{stats.lineCount} lines</div>
                <div>{stats.readingTime} read</div>
              </div>
              <div>Line {cursorPos.line}, Col {cursorPos.col}</div>
            </div>

            <div className="rounded-xl bg-white dark:bg-gray-800 shadow-2xl overflow-hidden" style={{minHeight: 'calc(100vh - 180px)'}}>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                className="w-full h-full p-8 bg-transparent text-gray-800 dark:text-gray-200 resize-none focus:outline-none"
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: '1.8',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  tabSize: 4,
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  minHeight: 'calc(100vh - 180px)'
                }}
                placeholder="Start typing your text..."
                spellCheck={false}
              />
            </div>
          </div>

          <div className="max-w-5xl mx-auto mt-6 flex flex-wrap justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+T</kbd> New Tab</div>
            <div><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+W</kbd> Close Tab</div>
            <div><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+S</kbd> Save</div>
            <div><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+Z</kbd> Undo</div>
            <div><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+Y</kbd> Redo</div>
          </div>
        </div>
      </div>

      {/* Notifications - Bottom Right */}
      {notification && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 flex items-center ${notification.type === 'success' ? 'bg-green-50 text-green-800 border-l-4 border-green-500 dark:bg-green-900/30 dark:text-green-200' : notification.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border-l-4 border-yellow-500 dark:bg-yellow-900/30 dark:text-yellow-200' : 'bg-indigo-50 text-indigo-800 border-l-4 border-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-200'}`}>
          {notification.message}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
    </div>
  );
}
