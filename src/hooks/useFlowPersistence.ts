import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FlowState<T = Record<string, unknown>> {
  serviceId: string;
  flowType: 'visita' | 'instalacao' | 'oficina' | 'entrega' | 'visita_continuacao' | 'oficina_continuacao';
  currentStep: string;
  formData: T;
  savedAt: string;
}

const STORAGE_KEY_PREFIX = 'technician_flow_';
const MAX_AGE_HOURS = 24;

function getStorageKey(serviceId: string, flowType: string): string {
  return `${STORAGE_KEY_PREFIX}${flowType}_${serviceId}`;
}

function isStateValid<T>(state: FlowState<T>): boolean {
  const savedAt = new Date(state.savedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);
  return hoursDiff < MAX_AGE_HOURS;
}

export interface DbResumeResult {
  step: string;
  formDataOverrides: Record<string, unknown>;
}

/**
 * Derives the correct resume step and pre-filled form data from the database.
 * This is used as a fallback when localStorage is empty (e.g. after phone browser restart).
 * Handles: photos, parts, service fields (detected_fault, work_performed, etc.)
 */
export async function deriveStepFromDb(
  serviceId: string,
  flowType: FlowState['flowType'],
  service: Record<string, unknown>
): Promise<DbResumeResult> {
  // Fetch photos for this service
  const { data: photos = [] } = await supabase
    .from('service_photos')
    .select('photo_type, file_url, uploaded_at')
    .eq('service_id', serviceId)
    .order('uploaded_at', { ascending: false });

  // Fetch parts for this service
  const { data: parts = [] } = await supabase
    .from('service_parts')
    .select('part_name, part_code, quantity, is_requested, arrived')
    .eq('service_id', serviceId);

  const photosByType: Record<string, string[]> = {};
  for (const photo of photos ?? []) {
    if (!photosByType[photo.photo_type]) photosByType[photo.photo_type] = [];
    photosByType[photo.photo_type].push(photo.file_url);
  }

  const hasPhoto = (type: string) => (photosByType[type]?.length ?? 0) > 0;
  const latestPhoto = (type: string) => photosByType[type]?.[0] ?? null;
  const allPhotos = (type: string) => photosByType[type] ?? [];

  const hasRequestedPart = (parts ?? []).some((p) => p.is_requested);
  const usedPartsList = (parts ?? [])
    .filter((p) => !p.is_requested)
    .map((p) => ({ name: p.part_name, reference: p.part_code ?? '', quantity: p.quantity ?? 1 }));

  const detectedFault = (service.detected_fault as string) || '';
  const workPerformed = (service.work_performed as string) || '';
  const flowStep = (service.flow_step as string) || '';
  const status = (service.status as string) || '';

  // Status that imply the service has already passed the initial entry/photos phase
  const isInProgress = ['em_execucao', 'na_oficina', 'para_pedir_peca', 'em_espera_de_peca', 'concluido'].includes(status);
  const hasAnyPhoto = photos.length > 0;

  // --- WORKSHOP FLOW ---
  if (flowType === 'oficina' || flowType === 'oficina_continuacao') {
    const formDataOverrides: Record<string, unknown> = {
      detectedFault,
      workPerformed,
      photoAparelho: latestPhoto('aparelho'),
      photoEtiqueta: latestPhoto('etiqueta'),
      photosEstado: allPhotos('estado'),
      usedPartsList,
      usedParts: usedPartsList.length > 0,
      productBrand: service.brand || "",
      productModel: service.model || "",
      productSerial: service.serial_number || "",
      productPNC: (service as any).pnc || "",
      productType: service.appliance_type || "",
    };

    if (flowType === 'oficina_continuacao') {
      return { step: 'confirmacao_peca', formDataOverrides };
    }

    // Prioritize explicit flow_step from DB
    if (flowStep && flowStep !== 'resumo' && flowStep !== 'resumo_continuacao') {
      return { step: flowStep, formDataOverrides };
    }

    // Skip initial photos if service is already in progress and has any photos
    const skipInitialPhotos = isInProgress && hasAnyPhoto;

    if (!skipInitialPhotos) {
      if (!hasPhoto('aparelho')) return { step: 'foto_aparelho', formDataOverrides };
      if (!hasPhoto('etiqueta')) return { step: 'foto_etiqueta', formDataOverrides };
      if (!hasPhoto('estado')) return { step: 'foto_estado', formDataOverrides };
    }

    const hasProductInfo = !!(service.brand && service.model);
    if (!hasProductInfo) return { step: 'produto', formDataOverrides };

    if (!detectedFault) return { step: 'diagnostico', formDataOverrides };
    if (hasRequestedPart) return { step: 'conclusao', formDataOverrides };
    if (!workPerformed) return { step: 'pecas_usadas', formDataOverrides };
    return { step: 'conclusao', formDataOverrides };
  }

  // --- VISIT FLOW ---
  if (flowType === 'visita' || flowType === 'visita_continuacao') {
    const serviceType = (service.service_type as string) || '';
    const isReparacao = serviceType === 'reparacao';

    const formDataOverrides: Record<string, unknown> = {
      detectedFault,
      photoAparelho: latestPhoto('aparelho'),
      photoEtiqueta: latestPhoto('etiqueta'),
      photosEstado: allPhotos('estado'),
      photoFile: latestPhoto('visita'),
      usedPartsList,
      usedParts: usedPartsList.length > 0,
      productBrand: service.brand || "",
      productModel: service.model || "",
      productSerial: service.serial_number || "",
      productPNC: (service as any).pnc || "",
      productType: service.appliance_type || "",
    };

    if (flowType === 'visita_continuacao') {
      return { step: 'confirmacao_peca', formDataOverrides };
    }

    // Prioritize explicit flow_step from DB
    if (flowStep && flowStep !== 'resumo' && flowStep !== 'resumo_continuacao') {
      return { step: flowStep, formDataOverrides };
    }

    // Skip initial photos if service is already in progress and has any photos
    const skipInitialPhotos = isInProgress && hasAnyPhoto;

    if (isReparacao) {
      if (!skipInitialPhotos) {
        if (!hasPhoto('aparelho')) return { step: 'foto_aparelho', formDataOverrides };
        if (!hasPhoto('etiqueta')) return { step: 'foto_etiqueta', formDataOverrides };
        if (!hasPhoto('estado')) return { step: 'foto_estado', formDataOverrides };
      }

      const hasProductInfo = !!(service.brand && service.model);
      if (!hasProductInfo) return { step: 'produto', formDataOverrides };

      if (!detectedFault) return { step: 'diagnostico', formDataOverrides };
      if (hasRequestedPart) return { step: 'pedir_peca', formDataOverrides };
      return { step: 'decisao', formDataOverrides };
    } else {
      if (!hasPhoto('visita')) return { step: 'foto', formDataOverrides };

      const hasProductInfo = !!(service.brand && service.model);
      if (!hasProductInfo) return { step: 'produto', formDataOverrides };

      if (!detectedFault) return { step: 'diagnostico', formDataOverrides };
      if (hasRequestedPart) return { step: 'pedir_peca', formDataOverrides };
      return { step: 'decisao', formDataOverrides };
    }
  }

  // --- INSTALLATION FLOW ---
  if (flowType === 'instalacao') {
    const formDataOverrides: Record<string, unknown> = {
      photoAntes: latestPhoto('instalacao_antes'),
      photoDepois: latestPhoto('instalacao_depois'),
      workPerformed,
      usedMaterials: usedPartsList,
    };

    if (!hasPhoto('instalacao_antes')) return { step: 'foto_antes', formDataOverrides };
    if (usedPartsList.length === 0) return { step: 'materiais', formDataOverrides };
    if (!workPerformed) return { step: 'trabalho', formDataOverrides };
    if (!hasPhoto('instalacao_depois')) return { step: 'foto_depois', formDataOverrides };
    return { step: 'finalizacao', formDataOverrides };
  }

  // --- DELIVERY FLOW ---
  if (flowType === 'entrega') {
    const formDataOverrides: Record<string, unknown> = {
      photoFile: latestPhoto('entrega'),
    };

    if (!hasPhoto('entrega')) return { step: 'foto', formDataOverrides };
    return { step: 'finalizacao', formDataOverrides };
  }

  return { step: 'resumo', formDataOverrides: {} };
}

export function useFlowPersistence<T extends Record<string, unknown>>(
  serviceId: string,
  flowType: FlowState['flowType']
) {
  const [isLoaded, setIsLoaded] = useState(false);

  const loadState = useCallback((): FlowState<T> | null => {
    try {
      const key = getStorageKey(serviceId, flowType);
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      const state = JSON.parse(stored) as FlowState<T>;
      if (state.serviceId !== serviceId || state.flowType !== flowType) return null;
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

  const saveState = useCallback((currentStep: string, formData: T) => {
    try {
      const key = getStorageKey(serviceId, flowType);
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

  const saveStateToDb = useCallback(async (currentStep: string, formData?: T) => {
    try {
      const { error } = await (supabase.rpc as any)('technician_update_service', {
        _service_id: serviceId,
        _flow_step: currentStep,
        _flow_data: formData || null,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error persisting flow state to DB:', error);
    }
  }, [serviceId]);

  const clearState = useCallback(() => {
    try {
      const key = getStorageKey(serviceId, flowType);
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing flow state:', error);
    }
  }, [serviceId]);

  const hasSavedState = useCallback((): boolean => {
    const state = loadState();
    return state !== null;
  }, [loadState]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return { isLoaded, loadState, saveState, saveStateToDb, clearState, hasSavedState };
}
