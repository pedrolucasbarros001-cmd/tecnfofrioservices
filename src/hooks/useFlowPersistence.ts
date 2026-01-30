import { useState, useEffect, useCallback } from 'react';

export interface FlowState<T = Record<string, unknown>> {
  serviceId: string;
  flowType: 'visita' | 'instalacao' | 'oficina' | 'entrega';
  currentStep: string;
  formData: T;
  savedAt: string;
}

const STORAGE_KEY_PREFIX = 'technician_flow_';
const MAX_AGE_HOURS = 24;

function getStorageKey(serviceId: string): string {
  return `${STORAGE_KEY_PREFIX}${serviceId}`;
}

function isStateValid<T>(state: FlowState<T>): boolean {
  const savedAt = new Date(state.savedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);
  return hoursDiff < MAX_AGE_HOURS;
}

export function useFlowPersistence<T extends Record<string, unknown>>(
  serviceId: string,
  flowType: FlowState['flowType']
) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved state from localStorage
  const loadState = useCallback((): FlowState<T> | null => {
    try {
      const key = getStorageKey(serviceId);
      const stored = localStorage.getItem(key);
      
      if (!stored) return null;
      
      const state = JSON.parse(stored) as FlowState<T>;
      
      // Validate state
      if (state.serviceId !== serviceId || state.flowType !== flowType) {
        return null;
      }
      
      // Check if state is still valid (not expired)
      if (!isStateValid(state)) {
        localStorage.removeItem(key);
        return null;
      }
      
      return state;
    } catch (error) {
      console.error('Error loading flow state:', error);
      return null;
    }
  }, [serviceId, flowType]);

  // Save state to localStorage
  const saveState = useCallback((currentStep: string, formData: T) => {
    try {
      const key = getStorageKey(serviceId);
      const state: FlowState<T> = {
        serviceId,
        flowType,
        currentStep,
        formData,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving flow state:', error);
    }
  }, [serviceId, flowType]);

  // Clear state from localStorage
  const clearState = useCallback(() => {
    try {
      const key = getStorageKey(serviceId);
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing flow state:', error);
    }
  }, [serviceId]);

  // Check if there's a saved state
  const hasSavedState = useCallback((): boolean => {
    const state = loadState();
    return state !== null;
  }, [loadState]);

  // Mark as loaded on mount
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return {
    isLoaded,
    loadState,
    saveState,
    clearState,
    hasSavedState,
  };
}
