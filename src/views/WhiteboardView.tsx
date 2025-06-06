import React from 'react';
import { PenTool, MousePointer, ArrowRight, Eraser } from 'lucide-react';

const WhiteboardView: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-text-main">AI Whiteboard</h1>
        <p className="text-text-secondary mt-1">Brainstorm high-level architecture with the Planner Agent in real-time.</p>
      </div>
      <div className="flex-grow bg-surface rounded-lg shadow-lg flex relative p-2">
        <div className="absolute top-2 left-2 bg-background p-2 rounded-lg shadow-xl flex gap-2">
          <button className="p-2 hover:bg-gray-700 rounded"><MousePointer className="h-5 w-5"/></button>
          <button className="p-2 hover:bg-gray-700 rounded"><PenTool className="h-5 w-5"/></button>
          <button className="p-2 hover:bg-gray-700 rounded"><ArrowRight className="h-5 w-5"/></button>
          <button className="p-2 hover:bg-gray-700 rounded"><Eraser className="h-5 w-5"/></button>
        </div>
        
        <div className="flex-grow flex items-center justify-center">
            <div className="text-center text-text-secondary">
                <h2 className="text-xl font-medium">Whiteboard Feature - Coming Soon</h2>
                <p className="max-w-md mt-2">This space will allow you to draw diagrams and write notes. The AI will interpret your designs to help build specifications and architectural models automatically.</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default WhiteboardView;