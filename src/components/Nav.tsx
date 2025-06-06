import React from 'react';

export type ViewName = "Dashboard" | "Specs" | "Tasks" | "Knowledge" | "Terminal" | "Settings";

interface NavProps {
  setCurrentView: (view: ViewName) => void;
  currentView: ViewName;
}

const Nav: React.FC<NavProps> = ({ setCurrentView, currentView }) => {
  const views: ViewName[] = ["Dashboard", "Specs", "Tasks", "Knowledge", "Terminal", "Settings"];
  return (
    <nav className="bg-gray-800/50 backdrop-blur-sm p-4 text-white fixed top-0 left-0 h-full w-56 flex flex-col border-r border-gray-700">
      <div className="flex items-center mb-8">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg mr-3"></div>
        <h1 className="text-xl font-bold text-gray-100">CognitoPilot</h1>
      </div>
      <ul className="flex-grow">
        {views.map(view => (
          <li key={view} className="mb-2">
            <button
              onClick={() => setCurrentView(view)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors duration-200 text-sm font-medium ${
                currentView === view
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {view}
            </button>
          </li>
        ))}
      </ul>
      <div className="text-xs text-gray-500 mt-4">Version 0.1.0</div>
    </nav>
  );
};

export default Nav;