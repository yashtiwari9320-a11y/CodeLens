
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './App.css';

function App() {
  const [language, setLanguage] = useState(() =>
    localStorage.getItem('codelens-default-language') || 'Python'
  );

  const [defaultLanguage, setDefaultLanguage] = useState(() =>
    localStorage.getItem('codelens-default-language') || 'Python'
  );

  const [theme, setTheme] = useState(() =>
    localStorage.getItem('codelens-theme') || 'dark'
  );

  const [code, setCode] = useState(
`numbers = [10, 20, 30, 40]

total = 0

for num in numbers:
    total += num

print(total)`
  );

  const [message, setMessage] = useState(
    'Your AI explanation will appear here.'
  );

  const [activeTab, setActiveTab] = useState('Explain');
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('codelens-history')) || [];
    } catch {
      return [];
    }
  });

  const [savedCode, setSavedCode] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('codelens-saved-code')) || [];
    } catch {
      return [];
    }
  });

  const [activePage, setActivePage] = useState('Dashboard');
  const [historySearch, setHistorySearch] = useState('');
  const [savedSearch, setSavedSearch] = useState('');

  const [showLanguageBreakdown, setShowLanguageBreakdown] = useState(false);

  // Persist preferences
  useEffect(() => {
    localStorage.setItem('codelens-default-language', defaultLanguage);
  }, [defaultLanguage]);

  useEffect(() => {
    localStorage.setItem('codelens-theme', theme);
  }, [theme]);

  // Persist History
  useEffect(() => {
    localStorage.setItem('codelens-history', JSON.stringify(history));
  }, [history]);

  // Persist Saved Code
  useEffect(() => {
    localStorage.setItem('codelens-saved-code', JSON.stringify(savedCode));
  }, [savedCode]);

  // Dashboard language usage statistics
  const languageUsage = Object.entries(
    [...history, ...savedCode].reduce((usage, item) => {
      if (item.language) {
        usage[item.language] = (usage[item.language] || 0) + 1;
      }

      return usage;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const totalLanguages = languageUsage.length;

  // Analyze code
  const handleAnalyze = async () => {
    if (!code.trim()) {
      setMessage('Please enter some code first.');
      return;
    }

    setLoading(true);
    setMessage('CodeLens AI is analyzing your code...');

    try {
      const response = await fetch(
        'https://codelens-4640.onrender.com/api/explain',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            language,
            task: activeTab,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to analyze code.');
      }

      setMessage(data.explanation);

      const newHistoryItem = {
        id: Date.now(),
        language,
        task: activeTab,
        code,
        explanation: data.explanation,
        date: new Date().toLocaleString(),
      };

      setHistory((previous) => [newHistoryItem, ...previous]);

    } catch (error) {
      console.error('Analysis Error:', error);
      setMessage(
        error.message ||
        'Unable to connect to CodeLens AI. Please check your backend.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Save current code
  const handleSaveCode = () => {
    if (!code.trim()) {
      alert('Please enter some code before saving.');
      return;
    }

    const title = window.prompt('Enter a title for your saved code:');

    if (title === null) return;

    if (!title.trim()) {
      alert('Please enter a valid title.');
      return;
    }

    const newSavedCode = {
      id: Date.now(),
      title: title.trim(),
      language,
      code,
      date: new Date().toLocaleString(),
    };

    setSavedCode((previous) => [newSavedCode, ...previous]);
    alert('Code saved successfully!');
  };

  // Delete History entry
  const deleteHistoryItem = (id) => {
    setHistory((previous) =>
      previous.filter((item) => item.id !== id)
    );
  };

  // Clear all History
  const clearAllHistory = () => {
    if (history.length === 0) return;

    if (window.confirm('Delete all analysis history? This cannot be undone.')) {
      setHistory([]);
      setHistorySearch('');
    }
  };

  // Delete saved code
  const deleteSavedCode = (id) => {
    setSavedCode((previous) =>
      previous.filter((item) => item.id !== id)
    );
  };

  // Clear all Saved Code
  const clearAllSavedCode = () => {
    if (savedCode.length === 0) return;

    if (window.confirm('Delete all saved code snippets? This cannot be undone.')) {
      setSavedCode([]);
      setSavedSearch('');
    }
  };

  // Clear all app data
  const clearAllData = () => {
    if (window.confirm(
      'This will permanently delete all History and Saved Code. Continue?'
    )) {
      setHistory([]);
      setSavedCode([]);
      setHistorySearch('');
      setSavedSearch('');
      setShowLanguageBreakdown(false);
    }
  };

  // Search History
  const filteredHistory = history.filter((item) => {
    const searchText = historySearch.toLowerCase().trim();

    if (!searchText) return true;

    return (
      item.language?.toLowerCase().includes(searchText) ||
      item.task?.toLowerCase().includes(searchText) ||
      item.code?.toLowerCase().includes(searchText) ||
      item.date?.toLowerCase().includes(searchText)
    );
  });

  // Search Saved Code
  const filteredSavedCode = savedCode.filter((item) => {
    const searchText = savedSearch.toLowerCase().trim();

    if (!searchText) return true;

    return (
      item.title?.toLowerCase().includes(searchText) ||
      item.language?.toLowerCase().includes(searchText) ||
      item.code?.toLowerCase().includes(searchText) ||
      item.date?.toLowerCase().includes(searchText)
    );
  });

  // Load saved code into editor
  const loadSavedCode = (item) => {
    setCode(item.code);
    setLanguage(item.language);
    setMessage('Your saved code is ready to analyze.');
    setActiveTab('Explain');
    setActivePage('Code Explainer');
  };

  // View an analysis from History
  const viewHistoryItem = (item) => {
    setCode(item.code);
    setLanguage(item.language);
    setActiveTab(item.task);
    setMessage(item.explanation);
    setActivePage('Code Explainer');
  };

  // Update default language
  const updateDefaultLanguage = (newLanguage) => {
    setDefaultLanguage(newLanguage);
    setLanguage(newLanguage);
  };

  // Mobile navigation items
  const mobileNavItems = [
    { page: 'Dashboard', icon: '⌂', label: 'Home' },
    { page: 'Code Explainer', icon: '⌨', label: 'Editor' },
    { page: 'History', icon: '◷', label: 'History' },
    { page: 'Saved Code', icon: '☆', label: 'Saved' },
    { page: 'Settings', icon: '⚙', label: 'Settings' },
  ];

  return (
    <div className={`app ${theme === 'light' ? 'light-theme' : ''}`}>

      <aside className="sidebar">
        <h2 className="logo">Code<span>Lens.</span></h2>

        <p className="nav-heading">WORKSPACE</p>

        <div
          className={`nav-item ${activePage === 'Dashboard' ? 'active' : ''}`}
          onClick={() => setActivePage('Dashboard')}
        >
          ⌘ Dashboard
        </div>

        <div
          className={`nav-item ${activePage === 'Code Explainer' ? 'active' : ''}`}
          onClick={() => setActivePage('Code Explainer')}
        >
          ⌨ Code Explainer
        </div>

        <div
          className={`nav-item ${activePage === 'History' ? 'active' : ''}`}
          onClick={() => setActivePage('History')}
        >
          ◷ History
        </div>

        <div
          className={`nav-item ${activePage === 'Saved Code' ? 'active' : ''}`}
          onClick={() => setActivePage('Saved Code')}
        >
          ☆ Saved Code
        </div>

        <div className="sidebar-bottom">
          <div
            className={`nav-item ${activePage === 'Settings' ? 'active' : ''}`}
            onClick={() => setActivePage('Settings')}
          >
            ⚙ Settings
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mobileNavItems.map((item) => (
          <button
            key={item.page}
            type="button"
            className={
              activePage === item.page
                ? 'mobile-nav-item active'
                : 'mobile-nav-item'
            }
            onClick={() => setActivePage(item.page)}
            aria-label={item.label}
            aria-current={activePage === item.page ? 'page' : undefined}
          >
            <span>{item.icon}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </nav>

      <main className="main">

        <header className="topbar">
          <div>
            <h2>
              {activePage === 'Settings'
                ? 'Settings'
                : activePage === 'Dashboard'
                ? 'Dashboard'
                : activePage === 'History'
                ? 'Analysis History'
                : activePage === 'Saved Code'
                ? 'Saved Code'
                : 'Code Workspace'}
            </h2>

            <p>
              {activePage === 'Settings'
                ? 'Customize your CodeLens experience.'
                : activePage === 'Dashboard'
                ? 'Your coding activity at a glance.'
                : activePage === 'History'
                ? 'Review your previous code analyses.'
                : activePage === 'Saved Code'
                ? 'Access your saved code snippets.'
                : 'Understand code. Learn smarter.'}
            </p>
          </div>

          <div className="status">
            <span className="status-dot"></span>
            AI Workspace
          </div>
        </header>

        {/* DASHBOARD PAGE */}
        {activePage === 'Dashboard' ? (

          <section className="dashboard-page">

            <div className="dashboard-welcome">
              <div>
                <p className="eyebrow">YOUR PERSONAL CODING ASSISTANT</p>
                <h1>Welcome back, Developer.</h1>
                <p>
                  Keep learning, exploring and making sense of code.
                  Your coding workspace is ready.
                </p>

                <button
                  className="analyze-btn dashboard-start-btn"
                  onClick={() => setActivePage('Code Explainer')}
                >
                  ⌨ Open Code Explainer →
                </button>
              </div>

              <div className="dashboard-welcome-icon">⌘</div>
            </div>

            {/* Dashboard Statistics */}
            <div className="dashboard-stats">

              <button
                type="button"
                className="dashboard-stat-card dashboard-stat-button"
                onClick={() => setActivePage('History')}
                title="Open Analysis History"
              >
                <div className="dashboard-stat-icon">◷</div>
                <div>
                  <p>Total Analyses</p>
                  <h2>{history.length}</h2>
                  <small>All-time code analyses</small>
                </div>
                <span className="stat-arrow">→</span>
              </button>

              <button
                type="button"
                className="dashboard-stat-card dashboard-stat-button"
                onClick={() => setActivePage('Saved Code')}
                title="Open Saved Code"
              >
                <div className="dashboard-stat-icon">☆</div>
                <div>
                  <p>Saved Snippets</p>
                  <h2>{savedCode.length}</h2>
                  <small>Your saved code collection</small>
                </div>
                <span className="stat-arrow">→</span>
              </button>

              <button
                type="button"
                className={`dashboard-stat-card dashboard-stat-button ${
                  showLanguageBreakdown ? 'stat-expanded' : ''
                }`}
                onClick={() => setShowLanguageBreakdown((previous) => !previous)}
                aria-expanded={showLanguageBreakdown}
                aria-controls="language-breakdown"
                title="Show language breakdown"
              >
                <div className="dashboard-stat-icon">⌨</div>
                <div>
                  <p>Languages Used</p>
                  <h2>{totalLanguages}</h2>
                  <small>
                    {showLanguageBreakdown
                      ? 'Hide language breakdown'
                      : 'Click to view breakdown'}
                  </small>
                </div>
                <span className="stat-arrow">
                  {showLanguageBreakdown ? '⌃' : '⌄'}
                </span>
              </button>

            </div>

            {/* Language Breakdown */}
            {showLanguageBreakdown && (
              <div
                className="panel dashboard-language-breakdown"
                id="language-breakdown"
              >
                <div className="panel-header">
                  <div>
                    <span className="panel-number">04</span>
                    <strong>Language Breakdown</strong>
                  </div>
                  <span>{totalLanguages} unique languages</span>
                </div>

                <div className="language-breakdown-content">

                  {languageUsage.length === 0 ? (
                    <div className="dashboard-empty">
                      <span>⌨</span>
                      <strong>No languages recorded yet</strong>
                      <p>Analyze or save some code to see your language statistics.</p>

                      <button
                        className="dashboard-link"
                        onClick={() => setActivePage('Code Explainer')}
                      >
                        Start analyzing code →
                      </button>
                    </div>
                  ) : (
                    languageUsage.map(([languageName, count]) => (
                      <div
                        className="language-usage-item"
                        key={languageName}
                      >
                        <div className="language-usage-info">
                          <strong>{languageName}</strong>
                          <span>
                            {count} {count === 1 ? 'record' : 'records'}
                          </span>
                        </div>

                        <div className="language-usage-track">
                          <div
                            className="language-usage-fill"
                            style={{
                              width: `${
                                (count / languageUsage[0][1]) * 100
                              }%`
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}

                </div>
              </div>
            )}

            {/* Dashboard Content */}
            <div className="dashboard-content">

              <div className="panel dashboard-section">

                <div className="panel-header">
                  <div>
                    <span className="panel-number">01</span>
                    <strong>Recent Activity</strong>
                  </div>

                  <button
                    className="dashboard-link"
                    onClick={() => setActivePage('History')}
                  >
                    View All →
                  </button>
                </div>

                <div className="dashboard-list">

                  {history.length === 0 ? (
                    <div className="dashboard-empty">
                      <span>◷</span>
                      <strong>No recent activity</strong>
                      <p>Your completed code analyses will appear here.</p>

                      <button
                        className="dashboard-link"
                        onClick={() => setActivePage('Code Explainer')}
                      >
                        Analyze your first code →
                      </button>
                    </div>
                  ) : (
                    history.slice(0, 4).map((item) => (
                      <div className="dashboard-list-item" key={item.id}>
                        <div className="dashboard-list-icon">⌨</div>

                        <div className="dashboard-list-info">
                          <strong>
                            {item.task} · {item.language}
                          </strong>
                          <small>{item.date}</small>
                        </div>

                        <button
                          className="dashboard-link"
                          onClick={() => viewHistoryItem(item)}
                        >
                          Open →
                        </button>
                      </div>
                    ))
                  )}

                </div>
              </div>

              <div className="panel dashboard-section">

                <div className="panel-header">
                  <div>
                    <span className="panel-number">02</span>
                    <strong>Saved Snippets</strong>
                  </div>

                  <button
                    className="dashboard-link"
                    onClick={() => setActivePage('Saved Code')}
                  >
                    View All →
                  </button>
                </div>

                <div className="dashboard-list">

                  {savedCode.length === 0 ? (
                    <div className="dashboard-empty">
                      <span>☆</span>
                      <strong>No saved snippets</strong>
                      <p>Save useful code to access it quickly later.</p>

                      <button
                        className="dashboard-link"
                        onClick={() => setActivePage('Code Explainer')}
                      >
                        Open Code Editor →
                      </button>
                    </div>
                  ) : (
                    savedCode.slice(0, 4).map((item) => (
                      <div className="dashboard-list-item" key={item.id}>
                        <div className="dashboard-list-icon">☆</div>

                        <div className="dashboard-list-info">
                          <strong>{item.title}</strong>
                          <small>
                            {item.language} · {item.date}
                          </small>
                        </div>

                        <button
                          className="dashboard-link"
                          onClick={() => loadSavedCode(item)}
                        >
                          Open →
                        </button>
                      </div>
                    ))
                  )}

                </div>
              </div>

            </div>

            {/* Quick Actions */}
            <div className="panel dashboard-quick-actions">

              <div className="panel-header">
                <div>
                  <span className="panel-number">03</span>
                  <strong>Quick Actions</strong>
                </div>
                <span>Workspace shortcuts</span>
              </div>

              <div className="quick-action-buttons">

                <button onClick={() => setActivePage('Code Explainer')}>
                  <span>⌨</span>
                  <strong>Analyze Code</strong>
                  <small>Explain, debug and learn</small>
                </button>

                <button onClick={() => setActivePage('History')}>
                  <span>◷</span>
                  <strong>View History</strong>
                  <small>Revisit previous analyses</small>
                </button>

                <button onClick={() => setActivePage('Saved Code')}>
                  <span>☆</span>
                  <strong>Saved Snippets</strong>
                  <small>Access your code collection</small>
                </button>

              </div>
            </div>

          </section>

        ) : activePage === 'Settings' ? (

          /* SETTINGS PAGE */
          <section className="panel settings-page">

            <div className="panel-header">
              <div>
                <span className="panel-number">05</span>
                <strong>Application Settings</strong>
              </div>
              <span>Preferences</span>
            </div>

            <div className="explanation-content">

              <div className="settings-section">
                <h3>⌨ Editor Preferences</h3>
                <p>Choose the programming language used by default.</p>

                <label className="settings-label">
                  Default Programming Language
                </label>

                <select
                  className="settings-select"
                  value={defaultLanguage}
                  onChange={(e) => updateDefaultLanguage(e.target.value)}
                >
                  <option>Python</option>
                  <option>C</option>
                  <option>C++</option>
                  <option>JavaScript</option>
                </select>
              </div>

              <div className="settings-section">
                <h3>◐ Appearance</h3>
                <p>Choose how CodeLens looks on your screen.</p>

                <div className="theme-options">

                  <button
                    className={`theme-option ${theme === 'dark' ? 'selected' : ''}`}
                    onClick={() => setTheme('dark')}
                  >
                    <span className="theme-preview dark-preview">◐</span>
                    <strong>Dark Mode</strong>
                    <small>Easy on the eyes</small>
                    {theme === 'dark' && <span className="theme-check">✓</span>}
                  </button>

                  <button
                    className={`theme-option ${theme === 'light' ? 'selected' : ''}`}
                    onClick={() => setTheme('light')}
                  >
                    <span className="theme-preview light-preview">☀</span>
                    <strong>Light Mode</strong>
                    <small>Bright and clean</small>
                    {theme === 'light' && <span className="theme-check">✓</span>}
                  </button>

                </div>
              </div>

              <div className="settings-section">
                <h3>▤ Data Management</h3>
                <p>Manage the data stored locally in this browser.</p>

                <div className="data-row">
                  <div>
                    <strong>Analysis History</strong>
                    <small>{history.length} saved analyses</small>
                  </div>

                  <button
                    className="settings-danger"
                    onClick={clearAllHistory}
                    disabled={history.length === 0}
                  >
                    Clear History
                  </button>
                </div>

                <div className="data-row">
                  <div>
                    <strong>Saved Code</strong>
                    <small>{savedCode.length} saved snippets</small>
                  </div>

                  <button
                    className="settings-danger"
                    onClick={clearAllSavedCode}
                    disabled={savedCode.length === 0}
                  >
                    Clear Saved Code
                  </button>
                </div>

                <button
                  className="settings-danger clear-everything"
                  onClick={clearAllData}
                  disabled={history.length === 0 && savedCode.length === 0}
                >
                  Delete All App Data
                </button>
              </div>

              <div className="settings-section about-section">
                <h3>ⓘ About CodeLens</h3>
                <p>Your personal AI-powered coding assistant.</p>

                <div className="about-details">
                  <div>
                    <span>Application</span>
                    <strong>CodeLens</strong>
                  </div>
                  <div>
                    <span>Version</span>
                    <strong>1.0.0</strong>
                  </div>
                  <div>
                    <span>AI Engine</span>
                    <strong>Google Gemini</strong>
                  </div>
                  <div>
                    <span>Storage</span>
                    <strong>Browser Local Storage</strong>
                  </div>
                </div>
              </div>

            </div>
          </section>

        ) : activePage === 'History' ? (

          /* HISTORY PAGE */
          <section className="panel">

            <div className="panel-header">
              <div>
                <span className="panel-number">03</span>
                <strong>Analysis History</strong>
              </div>
              <span>{history.length} saved analyses</span>
            </div>

            <div className="explanation-content">

              <div className="search-actions">
                <input
                  type="text"
                  placeholder="Search by language, task or code..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />

                <button
                  onClick={clearAllHistory}
                  disabled={history.length === 0}
                  className="settings-danger"
                >
                  Clear All
                </button>
              </div>

              <p className="settings-muted">
                Showing {filteredHistory.length} of {history.length} analyses
              </p>

              {history.length === 0 ? (
                <p>No analysis history yet. Analyze some code to get started!</p>
              ) : filteredHistory.length === 0 ? (
                <p>No matching analyses found. Try another search.</p>
              ) : (
                filteredHistory.map((item) => (
                  <div key={item.id} className="panel entry-card">
                    <strong>{item.task} · {item.language}</strong>
                    <p className="settings-muted">{item.date}</p>

                    <div className="entry-actions">
                      <button
                        className="analyze-btn"
                        onClick={() => viewHistoryItem(item)}
                      >
                        View Analysis
                      </button>

                      <button
                        className="settings-danger"
                        onClick={() => deleteHistoryItem(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}

            </div>
          </section>

        ) : activePage === 'Saved Code' ? (

          /* SAVED CODE PAGE */
          <section className="panel">

            <div className="panel-header">
              <div>
                <span className="panel-number">04</span>
                <strong>Saved Code</strong>
              </div>
              <span>{savedCode.length} saved snippets</span>
            </div>

            <div className="explanation-content">

              <input
                className="saved-search"
                type="text"
                placeholder="Search by title, language or code..."
                value={savedSearch}
                onChange={(e) => setSavedSearch(e.target.value)}
              />

              <p className="settings-muted">
                Showing {filteredSavedCode.length} of {savedCode.length} snippets
              </p>

              {savedCode.length === 0 ? (
                <p>No saved code yet. Open Code Explainer and save your first snippet!</p>
              ) : filteredSavedCode.length === 0 ? (
                <p>No matching snippets found. Try another search.</p>
              ) : (
                filteredSavedCode.map((item) => (
                  <div key={item.id} className="panel entry-card">
                    <strong>{item.title}</strong>
                    <p className="settings-muted">
                      {item.language} · {item.date}
                    </p>

                    <pre className="saved-code-preview">{item.code}</pre>

                    <div className="entry-actions">
                      <button
                        className="analyze-btn"
                        onClick={() => loadSavedCode(item)}
                      >
                        Open in Editor
                      </button>

                      <button
                        className="settings-danger"
                        onClick={() => deleteSavedCode(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}

            </div>
          </section>

        ) : (

          /* CODE EXPLAINER PAGE */
          <>

            <section className="welcome">
              <div>
                <p className="eyebrow">YOUR PERSONAL CODING ASSISTANT</p>
                <h1>
                  Understand your code<br />
                  <span>like never before.</span>
                </h1>
                <p className="welcome-text">
                  Paste your code, explore its logic and improve
                  your programming skills with AI.
                </p>
              </div>

              <div className="welcome-icon">⌘</div>
            </section>

            <section className="workspace">

              <div className="panel editor-panel">

                <div className="panel-header">
                  <div>
                    <span className="panel-number">01</span>
                    <strong>Code Editor</strong>
                  </div>

                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option>Python</option>
                    <option>C</option>
                    <option>C++</option>
                    <option>JavaScript</option>
                  </select>
                </div>

                <div className="editor-info">
                  <span>INPUT.CODE</span>
                  <span>{language}</span>
                </div>

                <textarea
                  className="code-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck="false"
                  placeholder="Paste your code here..."
                />

                <div className="editor-footer">
                  <span>● Editor ready</span>

                  <div className="editor-actions">

                    <button
                      onClick={handleSaveCode}
                      disabled={!code.trim()}
                      className="save-code-btn"
                    >
                      ☆ Save Code
                    </button>

                    <button
                      className="analyze-btn"
                      onClick={handleAnalyze}
                      disabled={loading}
                    >
                      {loading ? '✦ Analyzing...' : '✦ Analyze Code →'}
                    </button>

                  </div>
                </div>

              </div>

              <div className="panel explanation-panel">

                <div className="panel-header">
                  <div>
                    <span className="panel-number">02</span>
                    <strong>AI Explanation</strong>
                  </div>
                  <span className="ai-badge">✦ AI POWERED</span>
                </div>

                <div className="tabs">
                  {['Explain', 'Debug', 'Concepts'].map((tab) => (
                    <button
                      key={tab}
                      className={activeTab === tab ? 'tab active-tab' : 'tab'}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="explanation-content">
                  <div className="ai-icon">✦</div>
                  <h3>{activeTab} your code</h3>

                  <div className="ai-response markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message}
                    </ReactMarkdown>
                  </div>

                  <div className="coming-soon">
                    {loading ? 'AI IS THINKING...' : 'POWERED BY GEMINI AI'}
                  </div>
                </div>

              </div>

            </section>

          </>
        )}

        <footer>
          <span>CodeLens © 2026</span>
          <span>Built for curious developers.</span>
        </footer>

      </main>
    </div>
  );
}

export default App;
