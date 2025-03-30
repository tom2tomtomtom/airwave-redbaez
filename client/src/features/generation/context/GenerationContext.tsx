import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useCallback, 
  useMemo 
} from 'react';
import { 
  GeneratorPlugin, 
  BaseGenerationRequest, 
  BaseGenerationResult 
} from '../types/generation.types';
import { generatorRegistryService } from '../services/GeneratorRegistryService';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';

// --- State Shape ---

interface GenerationHistoryItem<Req, Res> {
  id: string; // Unique ID for this history item
  pluginId: string;
  request: Req;
  result?: Res; // Result might be pending initially
  status: 'pending' | 'success' | 'error';
  timestamp: number;
}

interface GenerationState<Req extends BaseGenerationRequest, Res extends BaseGenerationResult> {
  availablePlugins: GeneratorPlugin<any, any>[];
  selectedPluginId: string | null;
  currentRequest: Partial<Req>;
  history: GenerationHistoryItem<Req, Res>[];
  isLoading: boolean;
  error: string | null;
}

// --- Actions (for reducer) ---

type Action<Req extends BaseGenerationRequest, Res extends BaseGenerationResult> =
  | { type: 'SELECT_PLUGIN'; payload: string | null }
  | { type: 'UPDATE_REQUEST'; payload: Partial<Req> }
  | { type: 'START_GENERATION'; payload: { pluginId: string; request: Req; correlationId: string } }
  | { type: 'GENERATION_SUCCESS'; payload: { correlationId: string; result: Res } }
  | { type: 'GENERATION_ERROR'; payload: { correlationId: string; error: string } }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// --- Reducer ---

const generationReducer = <Req extends BaseGenerationRequest, Res extends BaseGenerationResult>(
  state: GenerationState<Req, Res>,
  action: Action<Req, Res>
): GenerationState<Req, Res> => {
  switch (action.type) {
    case 'SELECT_PLUGIN': {
      const plugin = generatorRegistryService.getPlugin(action.payload || '');
      return {
        ...state,
        selectedPluginId: action.payload,
        // Reset request data when plugin changes, applying defaults
        currentRequest: plugin?.getDefaults ? plugin.getDefaults() : {},
        error: null, // Clear errors on plugin change
      };
    }
    case 'UPDATE_REQUEST':
      return {
        ...state,
        currentRequest: { ...state.currentRequest, ...action.payload }, 
      };
    case 'START_GENERATION': {
      const newHistoryItem: GenerationHistoryItem<Req, Res> = {
        id: Date.now().toString(), // Simple unique ID for now
        pluginId: action.payload.pluginId,
        request: action.payload.request,
        status: 'pending',
        timestamp: Date.now(),
      };
      return {
        ...state,
        isLoading: true,
        error: null,
        history: [newHistoryItem, ...state.history], // Add to the start of history
      };
    }
    case 'GENERATION_SUCCESS':
      return {
        ...state,
        isLoading: false,
        history: state.history.map(item =>
          item.id === action.payload.correlationId
            ? { ...item, result: action.payload.result, status: 'success' }
            : item
        ),
      };
    case 'GENERATION_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload.error, // Set top-level error for display
        history: state.history.map(item =>
          item.id === action.payload.correlationId
            ? { 
                ...item, 
                status: 'error', 
                result: { // Add basic error info to the result object too
                  ...(item.result || {}),
                  status: 'error',
                  error: action.payload.error 
                } as Res
              } 
            : item
        ),
      };
    case 'CLEAR_HISTORY':
      return {
        ...state,
        history: [],
        error: null,
      };
     case 'SET_LOADING':
       return { ...state, isLoading: action.payload };
     case 'SET_ERROR':
       return { ...state, error: action.payload, isLoading: false }; // Ensure loading is false on error
    default:
      return state;
  }
}

// --- Context Definition ---

interface GenerationContextProps<Req extends BaseGenerationRequest, Res extends BaseGenerationResult> extends GenerationState<Req, Res> {
  selectPlugin: (pluginId: string | null) => void;
  updateRequest: (data: Partial<Req>) => void;
  triggerGeneration: () => Promise<void>; 
  clearHistory: () => void;
  // Expose the currently selected plugin object for convenience
  selectedPlugin: GeneratorPlugin<Req, Res> | undefined;
}

// Using 'any' initially for the context creation, will be typed by the provider
const GenerationContext = createContext<GenerationContextProps<any, any> | undefined>(
  undefined
);

// --- Provider Component ---

export const GenerationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // We need the client ID for generation requests
  const selectedClientId = useSelector((state: RootState) => state.clients.selectedClientId);

  const initialState: GenerationState<any, any> = {
    availablePlugins: generatorRegistryService.getAllPlugins(),
    selectedPluginId: null,
    currentRequest: {},
    history: [],
    isLoading: false,
    error: null,
  };

  const [state, dispatch] = useReducer(generationReducer, initialState);

  const selectPlugin = useCallback((pluginId: string | null) => {
    dispatch({ type: 'SELECT_PLUGIN', payload: pluginId });
  }, []);

  const updateRequest = useCallback((data: Partial<BaseGenerationRequest>) => {
    // Apply 'as any' here to handle dynamic request types across plugins
    dispatch({ type: 'UPDATE_REQUEST', payload: data as any }); 
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' });
  }, []);

  const triggerGeneration = useCallback(async () => {
    if (!state.selectedPluginId) {
      dispatch({ type: 'SET_ERROR', payload: 'No generation plugin selected.' });
      return;
    }
    if (!selectedClientId) {
       dispatch({ type: 'SET_ERROR', payload: 'No client selected.' });
       return;
    }

    const plugin = generatorRegistryService.getPlugin(state.selectedPluginId);
    if (!plugin) {
      dispatch({ type: 'SET_ERROR', payload: `Selected plugin '${state.selectedPluginId}' not found.` });
      return;
    }

    // Ensure client ID is included in the request
    const requestData = { 
      ...state.currentRequest, 
      clientId: selectedClientId 
    } as BaseGenerationRequest; // Cast necessary for the plugin call

    // Optional validation step
    if (plugin.validate) {
      const validation = plugin.validate(requestData as any); // Cast needed due to generic nature
      if (!validation.isValid) {
        const errorMsg = `Validation failed: ${Object.values(validation.errors || {}).join(', ')}`;
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        return;
      }
    }
    
    const correlationId = Date.now().toString();
    dispatch({ 
        type: 'START_GENERATION', 
        payload: { 
            pluginId: state.selectedPluginId, 
            request: requestData, 
            correlationId 
        } 
    });

    try {
      // Perform the generation using the plugin
      const result = await plugin.generate(requestData as any); // Cast needed
      
      if(result.status === 'success'){
        dispatch({ type: 'GENERATION_SUCCESS', payload: { correlationId, result } }); 
      } else {
        // Use the error from the result if available, otherwise generic
        const errorMsg = result.error || 'Generation failed with an unknown error.';
         dispatch({ type: 'GENERATION_ERROR', payload: { correlationId, error: errorMsg } }); 
      }
      
    } catch (err: any) {
      console.error('GenerationContext: Error during triggerGeneration:', err);
      const errorMsg = err.message || 'An unexpected error occurred during generation.';
      dispatch({ type: 'GENERATION_ERROR', payload: { correlationId, error: errorMsg } }); 
    }
  }, [state.selectedPluginId, state.currentRequest, selectedClientId]);

  // Memoize the selected plugin object based on ID
  const selectedPlugin = useMemo(() => {
      if (!state.selectedPluginId) return undefined;
      // Type assertion is okay here as we select based on available plugins
      return generatorRegistryService.getPlugin(state.selectedPluginId) as GeneratorPlugin<any, any> | undefined;
  }, [state.selectedPluginId]);

  const contextValue = useMemo(() => ({
    ...state,
    selectPlugin,
    updateRequest,
    triggerGeneration,
    clearHistory,
    selectedPlugin, // Include the memoized plugin object
  }), [state, selectPlugin, updateRequest, triggerGeneration, clearHistory, selectedPlugin]);

  return (
    <GenerationContext.Provider value={contextValue}>
      {children}
    </GenerationContext.Provider>
  );
};

// --- Consumer Hook ---

export function useGeneration<Req extends BaseGenerationRequest, Res extends BaseGenerationResult>(): GenerationContextProps<Req, Res> {
  const context = useContext(GenerationContext);
  if (context === undefined) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  // Although the provider manages state with 'any', the hook allows consumers
  // to specify the expected types for their specific use case, providing
  // better type safety downstream.
  return context as GenerationContextProps<Req, Res>;
}
