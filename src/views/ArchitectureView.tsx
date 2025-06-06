import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, { MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, Connection, Edge } from 'react-flow-renderer';
import { tauriApi } from '../utils/tauriApi';
import { ArchitectureGraph } from '../types';

const ArchitectureView: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [error, setError] = useState<string | null>(null);

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const graphData: ArchitectureGraph = await tauriApi.getArchitectureGraph();
        
        const flowNodes = graphData.nodes.map(node => ({
          id: node.id,
          type: 'default', // TODO: Custom nodes for different types
          data: { label: node.label },
          position: { x: Math.random() * 800, y: Math.random() * 600 }, // TODO: Use a layout algorithm
        }));

        const flowEdges = graphData.edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          animated: edge.data?.isViolation, // Animate violating edges
          style: edge.data?.isViolation ? { stroke: '#EF4444' } : undefined,
        }));

        setNodes(flowNodes);
        setEdges(flowEdges);
      } catch (err: any) {
        setError(err.message || "Failed to load architecture graph.");
      }
    };
    fetchGraph();
  }, [setNodes, setEdges]);

  return (
    <div className="h-full w-full space-y-4 flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-text-main">Living Architecture Model</h1>
        <p className="text-text-secondary mt-1">A real-time, deterministic graph of your codebase structure and dependencies.</p>
      </div>
      {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md">{error}</div>}
      <div className="flex-grow bg-surface rounded-lg shadow-lg relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
};

export default ArchitectureView;