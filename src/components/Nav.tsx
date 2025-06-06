import React from 'react';
import { Home, CheckSquare, ListChecks, BrainCircuit, DraftingCompass, Puzzle, BotMessageSquare, Terminal, Settings } from 'lucide-react';

export type ViewName = "Dashboard" | "Goals" | "Tasks" | "Architecture" | "Learning" | "Whiteboard" | "Knowledge" | "Terminal" | "Settings";

interface NavProps {
  setCurrentView: (view: ViewName) => void;
  currentView: ViewName;
}

const NavItem: React.FC<{ icon: React.ElementType; label: ViewName; isActive: boolean; onClick: () => void; }> = ({ icon: Icon, label, isActive, onClick }) => (
  <li className="mb-1">
    <button
      onClick={onClick}
      className={`w-full flex items-center px-3 py-2.5 rounded-md transition-colors duration-200 text-sm font-medium ${
        isActive
          ? 'bg-primary text-white shadow-lg'
          : 'text-text-secondary hover:bg-surface hover:text-text-main'
      }`}
    >
      <Icon className="h-5 w-5 mr-3" />
      {label}
    </button>
  </li>
);

const Nav: React.FC<NavProps> = ({ setCurrentView, currentView }) => {
  const views: { label: ViewName; icon: React.ElementType }[] = [
    { label: "Dashboard", icon: Home },
    { label: "Goals", icon: CheckSquare },
    { label: "Tasks", icon: ListChecks },
    { label: "Architecture", icon: DraftingCompass },
    { label: "Learning", icon: BrainCircuit },
    { label: "Whiteboard", icon: Puzzle },
    { label: "Knowledge", icon: BotMessageSquare },
    { label: "Terminal", icon: Terminal },
    { label: "Settings", icon: Settings },
  ];

  return (
    <nav className="bg-surface/80 backdrop-blur-sm p-4 text-white fixed top-0 left-0 h-full w-64 flex flex-col border-r border-border">
      <div className="flex items-center mb-10 px-2">
        <div className="w-10 h-10 bg-primary rounded-lg mr-3 flex items-center justify-center">
            <BotMessageSquare className="text-white"/>
        </div>
        <h1 className="text-xl font-bold text-text-main">CognitoPilot</h1>
      </div>
      <ul className="flex-grow">
        {views.map(view => (
          <NavItem key={view.label} icon={view.icon} label={view.label} isActive={currentView === view.label} onClick={() => setCurrentView(view.label)} />
        ))}
      </ul>
      <div className="text-xs text-text-tertiary mt-4 px-3">Version 0.1.0</div>
    </nav>
  );
};

export default Nav;