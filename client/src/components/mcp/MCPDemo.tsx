import React, { useState } from 'react';
import { mcpClient } from '../../api/mcpClient';
import { MCPResponse, MCPStepResult } from '../../types/mcp';

/**
 * Demo component that showcases the sequential thinking MCP service
 */
const MCPDemo: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [context, setContext] = useState<string>('{}');
  const [maxSteps, setMaxSteps] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<MCPResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Process the MCP request when form is submitted
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Parse context as JSON or use empty object if invalid
      let parsedContext = {};
      try {
        parsedContext = context ? JSON.parse(context) : {};
      } catch (err) {
        setError('Invalid JSON in context field. Using empty context.');
      }

      // Call the MCP service
      const result = await mcpClient.processRequest({
        input,
        context: parsedContext,
        maxSteps,
      });

      setResponse(result);
    } catch (err) {
      console.error('Error calling MCP service:', err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Render a single step from the MCP response
   */
  const renderStep = (step: MCPStepResult, index: number) => (
    <div key={index} className="bg-white p-4 mb-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Step {step.step}</h3>
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-500 mb-1">Reasoning:</h4>
        <div className="bg-gray-50 p-3 rounded whitespace-pre-wrap">{step.reasoning}</div>
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-500 mb-1">Output:</h4>
        <div className="bg-gray-50 p-3 rounded whitespace-pre-wrap">{step.output}</div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Sequential Thinking MCP Demo</h1>
      
      <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-4 rounded-lg shadow">
        <div className="mb-4">
          <label htmlFor="input" className="block text-sm font-medium text-gray-700 mb-1">
            Input Prompt:
          </label>
          <textarea
            id="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            rows={4}
            placeholder="Enter your prompt or question here..."
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-1">
            Context (JSON):
          </label>
          <textarea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            rows={3}
            placeholder='{"key": "value"}'
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional JSON object with context data for the model.
          </p>
        </div>
        
        <div className="mb-4">
          <label htmlFor="maxSteps" className="block text-sm font-medium text-gray-700 mb-1">
            Maximum Steps:
          </label>
          <input
            id="maxSteps"
            type="number"
            value={maxSteps}
            onChange={(e) => setMaxSteps(parseInt(e.target.value, 10))}
            className="p-2 border border-gray-300 rounded-md"
            min={1}
            max={10}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className={`px-4 py-2 rounded-md text-white ${
            loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Processing...' : 'Process Request'}
        </button>
      </form>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {response && (
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Results</h2>
            <div className="text-sm text-gray-500">
              Completed in {response.metadata.executionTimeMs}ms with {response.metadata.totalSteps} steps
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Final Output:</h3>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 whitespace-pre-wrap">
              {response.finalOutput}
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mb-3">Step-by-Step Reasoning:</h3>
          <div className="space-y-4">
            {response.results.map((step, index) => renderStep(step, index))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MCPDemo;
