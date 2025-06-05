import React, { useState } from "react";

interface HumanInputDialogProps {
  taskId: string;
  prompt: string;
  onSubmit: (taskId: string, responseText: string) => void;
  onClose: () => void;
}

const HumanInputDialog: React.FC<HumanInputDialogProps> = ({
  taskId,
  prompt,
  onSubmit,
  onClose,
}) => {
  const [responseText, setResponseText] = useState("");

  const handleSubmit = () => {
    if (responseText.trim()) {
      onSubmit(taskId, responseText);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h3 className="text-xl font-semibold text-yellow-400 mb-3">
          Human Input Required
        </h3>
        <p className="text-sm text-gray-300 mb-1">
          Task ID: <span className="font-mono">{taskId}</span>
        </p>
        <p className="text-gray-200 mb-4 whitespace-pre-wrap">{prompt}</p>
        <textarea
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          rows={5}
          className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
          placeholder="Your response or clarification..."
        />
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white"
          >
            Cancel / Later
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          >
            Submit Response
          </button>
        </div>
      </div>
    </div>
  );
};
export default HumanInputDialog;
