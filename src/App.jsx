
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './App.css';

const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:5000'
  : 'https://codelens-4640.onrender.com';

const getStoredArray = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
};

const formatDate = (date) => {
  if (!date) return new Date().toLocaleString();

  const parsedDate = new Date(date);

  return Number.isNaN(parsedDate.getTime())
    ? date
    : parsedDate.toLocaleString();
};

const normalizeHistory = (item) => ({
  id: String(item._id || item.id || Date.now()),
  language: item.language,
  task: item.task,
  code: item.code,
  explanation: item.explanation,
  date: formatDate(item.createdAt || item.date),
});

const normalizeSavedCode = (item) => ({
  id: String(item._id || item.id || Date.now()),
  title: item.title,
  language: item.language,
  code: item.code,
  task: item.task || 'Explain',
  explanation: item.explanation || '',
  date: formatDate(item.createdAt || item.date),
});

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

  const [history, setHistory] = useState(() =>
    getStoredArray('codelens-history')
  );

  const [savedCode, setSavedCode] = useState(() =>
    getStoredArray('codelens-saved-code')
  );

  // Authentication state
  const [token, setToken] = useState(() =>
    localStorage.getItem('codelens-token') || ''
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('codelens-user')) || null;
    } catch {
      return null;
    }
  });

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [dataLoading, setDataLoading] = useState(false);

  const isAuthenticated = Boolean(token && user);

  const [activePage, setActivePage] = useState('Dashboard');
  const [historySearch, setHistorySearch] = useState('');
  const [savedSearch, setSavedSearch] = useState('');
  const [showLanguageBreakdown, setShowLanguageBreakdown] = useState(false);

  // API helper for authenticated requests.
  const authenticatedRequest = async (endpoint, options = {}, authToken = token) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        ...(options.headers || {}),
      },
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.message || data.error || 'The request could not be completed.'
      );
    }

    return data;
  };

  // Load the logged-in user's cloud data.
  const loadCloudData = async (authToken) => {
    setDataLoading(true);

    try {
      const [historyData, savedData] = await Promise.all([
        authenticatedRequest('/api/user-data/history', {}, authToken),
        authenticatedRequest('/api/user-data/saved-code', {}, authToken),
      ]);

      const cloudHistory = Array.isArray(historyData.history)
        ? historyData.history
        : [];

      const cloudSavedCode = Array.isArray(savedData.savedCode)
        ? savedData.savedCode
        : [];

      setHistory(cloudHistory.map(normalizeHistory));
      setSavedCode(cloudSavedCode.map(normalizeSavedCode));
    } finally {
      setDataLoading(false);
    }
  };

  // Restore a previously logged-in session.
  useEffect(() => {
    if (!token || !user) return;

    let cancelled = false;

    const restoreSession = async () => {
      try {
        const [historyData, savedData] = await Promise.all([
          authenticatedRequest('/api/user-data/history', {}, token),
          authenticatedRequest('/api/user-data/saved-code', {}, token),
        ]);

        if (cancelled) return;

        setHistory(
          (Array.isArray(historyData.history) ? historyData.history : [])
            .map(normalizeHistory)
        );

        setSavedCode(
          (Array.isArray(savedData.savedCode) ? savedData.savedCode : [])
            .map(normalizeSavedCode)
        );
      } catch (error) {
        if (cancelled) return;

        console.error('Session restoration error:', error);

        localStorage.removeItem('codelens-token');
        localStorage.removeItem('codelens-user');

        setToken('');
        setUser(null);
        setHistory(getStoredArray('codelens-history'));
        setSavedCode(getStoredArray('codelens-saved-code'));
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist preferences.
  useEffect(() => {
    localStorage.setItem('codelens-default-language', defaultLanguage);
  }, [defaultLanguage]);

  useEffect(() => {
    localStorage.setItem('codelens-theme', theme);
  }, [theme]);

  // Only guests write History and Saved Code to browser storage.
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('codelens-history', JSON.stringify(history));
    }
  }, [history, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('codelens-saved-code', JSON.stringify(savedCode));
    }
  }, [savedCode, isAuthenticated]);

  // Dashboard language usage statistics.
  const languageUsage = Object.entries(
    [...history, ...savedCode].reduce((usage, item) => {
      if (item.language) {
        usage[item.language] = (usage[item.language] || 0) + 1;
      }

      return usage;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const totalLanguages = languageUsage.length;

  // Register or log in.
  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    setAuthError('');
    setAuthMessage('');

    if (!authEmail.trim() || !authPassword) {
      setAuthError('Please enter your email and password.');
      return;
    }

    if (authMode === 'register' && !authName.trim()) {
      setAuthError('Please enter your name.');
      return;
    }

    if (authMode === 'register' && authPassword.length < 6) {
      setAuthError('Password must contain at least 6 characters.');
      return;
    }

    setAuthLoading(true);

    try {
      const endpoint = authMode === 'register'
        ? '/api/auth/register'
        : '/api/auth/login';

      const body = authMode === 'register'
        ? {
            name: authName.trim(),
            email: authEmail.trim(),
            password: authPassword,
          }
        : {
            email: authEmail.trim(),
            password: authPassword,
          };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || 'Authentication failed.'
        );
      }

      if (!data.token || !data.user) {
        throw new Error('The server returned an invalid authentication response.');
      }

      localStorage.setItem('codelens-token', data.token);
      localStorage.setItem('codelens-user', JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);

      setAuthPassword('');
      setAuthName('');
      setAuthEmail('');
      setShowPassword(false);
      setShowAuth(false);
      setAuthError('');
      setAuthMessage('');

      try {
        await loadCloudData(data.token);
      } catch (syncError) {
        console.error('Cloud data loading error:', syncError);
        setMessage(
          'You are logged in, but your cloud data could not be loaded. Please refresh and try again.'
        );
      }
    } catch (error) {
      console.error('Authentication Error:', error);
      setAuthError(error.message || 'Unable to authenticate. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Log out and restore the guest's browser data.
  const handleLogout = () => {
    localStorage.removeItem('codelens-token');
    localStorage.removeItem('codelens-user');

    setToken('');
    setUser(null);

    setHistory(getStoredArray('codelens-history'));
    setSavedCode(getStoredArray('codelens-saved-code'));

    setHistorySearch('');
    setSavedSearch('');
    setShowAuth(false);
    setActivePage('Dashboard');
    setMessage('You are now using CodeLens as a guest.');
  };

  // Analyze code.
  const handleAnalyze = async () => {
    if (!code.trim()) {
      setMessage('Please enter some code first.');
      return;
    }

    setLoading(true);
    setMessage('Connecting to CodeLens AI...');

    let slowRequestTimer;
    let longRequestTimer;

    try {
      slowRequestTimer = setTimeout(() => {
        setMessage(
          'This is taking longer than usual. The server may be starting after inactivity. Please keep this page open...'
        );
      }, 8000);

      longRequestTimer = setTimeout(() => {
        setMessage(
          'The CodeLens server is still starting or processing your request. This can take 50 seconds or more after inactivity. Please wait...'
        );
      }, 20000);

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

      if (!data.explanation) {
        throw new Error(
          'The AI returned an empty response. Please try again.'
        );
      }

      setMessage(data.explanation);

      const newHistoryItem = {
        id: String(Date.now()),
        language,
        task: activeTab,
        code,
        explanation: data.explanation,
        date: new Date().toLocaleString(),
      };

      if (isAuthenticated) {
        try {
          const savedData = await authenticatedRequest(
            '/api/user-data/history',
            {
              method: 'POST',
              body: JSON.stringify({
                language,
                task: activeTab,
                code,
                explanation: data.explanation,
              }),
            }
          );

          const savedItem = savedData.history || savedData.item || savedData;

          setHistory((previous) => [
            normalizeHistory(savedItem),
            ...previous,
          ]);
        } catch (syncError) {
          console.error('History sync error:', syncError);
          setMessage(
            `${data.explanation}\n\n---\n**Note:** Your analysis succeeded, but it could not be saved to your account.`
          );
        }
      } else {
        setHistory((previous) => [newHistoryItem, ...previous]);
      }
    } catch (error) {
      console.error('Analysis Error:', error);

      setMessage(
        error.message ||
        'Unable to connect to CodeLens AI. Please try again.'
      );
    } finally {
      clearTimeout(slowRequestTimer);
      clearTimeout(longRequestTimer);
      setLoading(false);
    }
  };

  // Save current code with its AI analysis.
  const handleSaveCode = async () => {
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
      id: String(Date.now()),
      title: title.trim(),
      language,
      code,
      task: activeTab,
      explanation: message,
      date: new Date().toLocaleString(),
    };

    if (isAuthenticated) {
      try {
        const savedData = await authenticatedRequest(
          '/api/user-data/saved-code',
          {
            method: 'POST',
            body: JSON.stringify({
              title: title.trim(),
              language,
              code,
              task: activeTab,
              explanation: message,
            }),
          }
        );

        const savedItem = savedData.savedCode || savedData.item;

        if (!savedItem) {
          throw new Error('Saved code response was invalid.');
        }

        setSavedCode((previous) => [
          normalizeSavedCode(savedItem),
          ...previous,
        ]);

        alert('Code and AI analysis saved successfully!');
      } catch (error) {
        console.error('Saved code sync error:', error);
        alert(error.message || 'Unable to save code to your account.');
      }
    } else {
      setSavedCode((previous) => [newSavedCode, ...previous]);
      alert('Code and AI analysis saved successfully!');
    }
  };

  // Delete History entry.
  const deleteHistoryItem = async (id) => {
    if (isAuthenticated) {
      try {
        await authenticatedRequest(
          `/api/user-data/history/${id}`,
          { method: 'DELETE' }
        );
      } catch (error) {
        alert(error.message || 'Unable to delete this history entry.');
        return;
      }
    }

    setHistory((previous) =>
      previous.filter((item) => String(item.id) !== String(id))
    );
  };

  // Clear all History.
  const clearAllHistory = async () => {
    if (history.length === 0) return;

    if (window.confirm('Delete all analysis history? This cannot be undone.')) {
      if (isAuthenticated) {
        try {
          await authenticatedRequest(
            '/api/user-data/history',
            { method: 'DELETE' }
          );
        } catch (error) {
          alert(error.message || 'Unable to clear account history.');
          return;
        }
      }

      setHistory([]);
      setHistorySearch('');
    }
  };

  // Delete saved code.
  const deleteSavedCode = async (id) => {
    if (isAuthenticated) {
      try {
        await authenticatedRequest(
          `/api/user-data/saved-code/${id}`,
          { method: 'DELETE' }
        );
      } catch (error) {
        alert(error.message || 'Unable to delete this saved snippet.');
        return;
      }
    }

    setSavedCode((previous) =>
      previous.filter((item) => String(item.id) !== String(id))
    );
  };

  // Clear all Saved Code.
  const clearAllSavedCode = async () => {
    if (savedCode.length === 0) return;

    if (window.confirm('Delete all saved code snippets? This cannot be undone.')) {
      if (isAuthenticated) {
        try {
          await authenticatedRequest(
            '/api/user-data/saved-code',
            { method: 'DELETE' }
          );
        } catch (error) {
          alert(error.message || 'Unable to clear saved code.');
          return;
        }
      }

      setSavedCode([]);
      setSavedSearch('');
    }
  };

  // Clear all app data.
  const clearAllData = async () => {
    if (window.confirm(
      'This will permanently delete all History and Saved Code. Continue?'
    )) {
      if (isAuthenticated) {
        try {
          await Promise.all([
            authenticatedRequest(
              '/api/user-data/history',
              { method: 'DELETE' }
            ),
            authenticatedRequest(
              '/api/user-data/saved-code',
              { method: 'DELETE' }
            ),
          ]);
        } catch (error) {
          alert(error.message || 'Unable to delete account data.');
          return;
        }
      }

      setHistory([]);
      setSavedCode([]);
      setHistorySearch('');
      setSavedSearch('');
      setShowLanguageBreakdown(false);
    }
  };

  // Search History.
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

  // Search Saved Code.
  const filteredSavedCode = savedCode.filter((item) => {
    const searchText = savedSearch.toLowerCase().trim();

    if (!searchText) return true;

    return (
      item.title?.toLowerCase().includes(searchText) ||
      item.language?.toLowerCase().includes(searchText) ||
      item.code?.toLowerCase().includes(searchText) ||
      item.date?.toLowerCase().includes(searchText) ||
      item.explanation?.toLowerCase().includes(searchText)
    );
  });

  // Load saved code and its original AI analysis into the editor.
  const loadSavedCode = (item) => {
    setCode(item.code);
    setLanguage(item.language);
    setMessage(
      item.explanation || 'No saved AI analysis is available for this item.'
    );
    setActiveTab(item.task || 'Explain');
    setActivePage('Code Explainer');
  };

  // View an analysis from History.
  const viewHistoryItem = (item) => {
    setCode(item.code);
    setLanguage(item.language);
    setActiveTab(item.task);
    setMessage(item.explanation);
    setActivePage('Code Explainer');
  };

  // Update default language.
  const updateDefaultLanguage = (newLanguage) => {
    setDefaultLanguage(newLanguage);
    setLanguage(newLanguage);
  };

  // Mobile navigation items.
  const mobileNavItems = [
    { page: 'Dashboard', icon: '⌂', label: 'Home' },
    { page: 'Code Explainer', icon: '⌨', label: 'Editor' },
    { page: 'History', icon: '◷', label: 'History' },
    { page: 'Saved Code', icon: '☆', label: 'Saved' },
    { page: 'Settings', icon: '⚙', label: 'Settings' },
  ];

  const goToDashboard = () => {
    setActivePage('Dashboard');
    setShowLanguageBreakdown(false);
  };

  return (
    <div className={`app ${theme === 'light' ? 'light-theme' : ''}`}>

      <aside className="sidebar">
        <button
          type="button"
          className="logo"
          onClick={goToDashboard}
          aria-label="Go to CodeLens Dashboard"
        >
          Code<span>Lens.</span>
        </button>

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

        {/* TOP HEADER */}
        <header className="topbar">
          <div className="topbar-brand">

            <button
              type="button"
              className="mobile-brand"
              onClick={goToDashboard}
              aria-label="Go to CodeLens Dashboard"
            >
              <span className="mobile-brand-icon">⌘</span>
              <span className="mobile-brand-name">
                Code<span>Lens.</span>
              </span>
            </button>

            <div className="page-heading">
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
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            {isAuthenticated ? (
              <>
                <span
                  title={user.email}
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary, #aaa)',
                    maxWidth: '150px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.name}
                </span>

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    padding: '8px 13px',
                    border: '1px solid var(--border-color, #333)',
                    borderRadius: '7px',
                    background: 'transparent',
                    color: 'inherit',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                  setAuthMessage('');
                  setShowPassword(false);
                  setShowAuth(true);
                }}
                style={{
                  padding: '8px 14px',
                  border: '1px solid var(--border-color, #444)',
                  borderRadius: '7px',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Sign In
              </button>
            )}

            <div className="status">
              <span className="status-dot"></span>
              AI Workspace
            </div>
          </div>
        </header>

        {/* DASHBOARD PAGE */}
        {activePage === 'Dashboard' ? (

          <section className="dashboard-page">

            <div className="dashboard-welcome">
              <div>
                <p className="eyebrow">YOUR PERSONAL CODING ASSISTANT</p>
                <h1>
                  {isAuthenticated
                    ? `Welcome back, ${user.name}.`
                    : 'Welcome, Developer.'}
                </h1>
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

            {dataLoading && (
              <p className="settings-muted">Loading your cloud data...</p>
            )}

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
                <h3>Account</h3>
                <p>
                  {isAuthenticated
                    ? 'Your History and Saved Code are synced with your account.'
                    : 'You are currently using CodeLens as a guest. Your data is stored in this browser.'}
                </p>

                {isAuthenticated ? (
                  <div className="about-details">
                    <div>
                      <span>Name</span>
                      <strong>{user.name}</strong>
                    </div>
                    <div>
                      <span>Email</span>
                      <strong>{user.email}</strong>
                    </div>
                    <div>
                      <span>Storage</span>
                      <strong>MongoDB Cloud</strong>
                    </div>
                  </div>
                ) : (
                  <button
                    className="analyze-btn"
                    onClick={() => {
                      setAuthMode('register');
                      setAuthError('');
                      setShowPassword(false);
                      setShowAuth(true);
                    }}
                  >
                    Create an Account
                  </button>
                )}
              </div>

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
                <p>
                  {isAuthenticated
                    ? 'Manage the History and Saved Code stored in your account.'
                    : 'Manage the data stored locally in this browser.'}
                </p>

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
                    <strong>
                      {isAuthenticated ? 'MongoDB Cloud' : 'Browser Local Storage'}
                    </strong>
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

                    {/* SAVED AI ANALYSIS */}
                    <div className="saved-analysis">
                      <strong>AI Analysis</strong>

                      <p className="saved-analysis-type">
                        Analysis type: {item.task || 'Explain'}
                      </p>

                      {item.explanation ? (
                        <div className="explanation-content markdown-content">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {item.explanation}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="settings-muted">
                          No AI analysis was stored with this snippet.
                          Save a newly analyzed snippet to preserve its explanation.
                        </p>
                      )}
                    </div>

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

      {/* AUTHENTICATION MODAL */}
      {showAuth && (
        <div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowAuth(false);
              setShowPassword(false);
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(5px)',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '30px',
              borderRadius: '12px',
              border: '1px solid var(--border-color, #333)',
              background: 'var(--panel-bg, #15171d)',
              color: 'var(--text-color, #f1f2f7)',
              boxShadow: '0 20px 70px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}>
              <h2 id="auth-title" style={{ margin: 0 }}>
                {authMode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>

              <button
                type="button"
                onClick={() => {
                  setShowAuth(false);
                  setShowPassword(false);
                }}
                aria-label="Close authentication"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'inherit',
                  fontSize: '22px',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <p style={{
              margin: '0 0 22px',
              color: 'var(--text-secondary, #aaa)',
              fontSize: '13px',
              lineHeight: 1.6,
            }}>
              {authMode === 'login'
                ? 'Sign in to access your saved analyses and code from anywhere.'
                : 'Create an account to securely sync your History and Saved Code.'}
            </p>

            <form onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <label style={{
                  display: 'block',
                  marginBottom: '14px',
                  fontSize: '13px',
                }}>
                  Full Name
                  <input
                    type="text"
                    value={authName}
                    onChange={(event) => setAuthName(event.target.value)}
                    placeholder="Enter your name"
                    autoComplete="name"
                    required
                    style={authInputStyle}
                  />
                </label>
              )}

              <label style={{
                display: 'block',
                marginBottom: '14px',
                fontSize: '13px',
              }}>
                Email Address
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  style={authInputStyle}
                />
              </label>

              <label style={{
                display: 'block',
                marginBottom: '16px',
                fontSize: '13px',
              }}>
                Password

                <div style={{
                  position: 'relative',
                  marginTop: '7px',
                }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete={
                      authMode === 'login'
                        ? 'current-password'
                        : 'new-password'
                    }
                    minLength={authMode === 'register' ? 6 : undefined}
                    required
                    style={{
                      ...authInputStyle,
                      marginTop: 0,
                      paddingRight: '46px',
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '5px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-secondary, #aaa)',
                      cursor: 'pointer',
                    }}
                  >
                    {showPassword ? (
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.2 2.2-2.4 3.3" />
                        <path d="M6.2 6.2C3.9 7.7 2.4 10 2 12c1 2.5 5 7 10 7 1.2 0 2.3-.2 3.3-.7" />
                      </svg>
                    ) : (
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>

              {authError && (
                <p style={{
                  color: '#ef7777',
                  fontSize: '13px',
                  margin: '0 0 14px',
                }}>
                  {authError}
                </p>
              )}

              {authMessage && (
                <p style={{
                  color: '#70c99a',
                  fontSize: '13px',
                  margin: '0 0 14px',
                }}>
                  {authMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="analyze-btn"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  marginTop: '4px',
                }}
              >
                {authLoading
                  ? 'Please wait...'
                  : authMode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
              </button>
            </form>

            <p style={{
              margin: '20px 0 0',
              textAlign: 'center',
              fontSize: '13px',
              color: 'var(--text-secondary, #aaa)',
            }}>
              {authMode === 'login'
                ? "Don't have an account? "
                : 'Already have an account? '}

              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setAuthError('');
                  setAuthMessage('');
                  setShowPassword(false);
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--accent-color, #a99aff)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                {authMode === 'login' ? 'Register' : 'Sign In'}
              </button>
            </p>

            <button
              type="button"
              onClick={() => {
                setShowAuth(false);
                setShowPassword(false);
              }}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '10px',
                border: '1px solid var(--border-color, #333)',
                borderRadius: '7px',
                background: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Continue as Guest
            </button>
          </section>
        </div>
      )}

    </div>
  );
}

const authInputStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  marginTop: '7px',
  padding: '11px 12px',
  border: '1px solid var(--border-color, #444)',
  borderRadius: '7px',
  background: 'var(--input-bg, #0e1015)',
  color: 'inherit',
  outline: 'none',
  fontSize: '13px',
};

export default App;
