import { useState, useEffect, useCallback, useRef } from 'react';
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
  // Parallel fetch: photos metadata + parts
  const [photoMetaResult, partsResult] = await Promise.all([
    supabase
      .from('service_photos')
      .select('id, photo_type, uploaded_at')
      .eq('service_id', serviceId)
      .order('uploaded_at', { ascending: false }),
    supabase
      .from('service_parts')
      .select('part_name, part_code, quantity, is_requested, arrived')
      .eq('service_id', serviceId),
  ]);

  const photoMetadata = photoMetaResult.data ?? [];
  const parts = partsResult.data ?? [];

  const photoMetadataByType: Record<string, { id: string; uploaded_at: string }[]> = {};
  for (const photo of photoMetadata) {
    if (!photoMetadataByType[photo.photo_type]) photoMetadataByType[photo.photo_type] = [];
    photoMetadataByType[photo.photo_type].push({ id: photo.id, uploaded_at: photo.uploaded_at });
  }

  const hasPhoto = (type: string) => (photoMetadataByType[type]?.length ?? 0) > 0;
  const hasAnyPhoto = photoMetadata.length > 0;

  const hasRequestedPart = parts.some((p) => p.is_requested);
  const usedPartsList = parts
    .filter((p) => !p.is_requested)
    .map((p) => ({ name: p.part_name, reference: p.part_code ?? '', quantity: p.quantity ?? 1 }));

  // Identify photo IDs we actually need to fetch URLs for
  const idsToFetch: string[] = [];
  const addLatestId = (type: string) => {
    if (photoMetadataByType[type]?.[0]) idsToFetch.push(photoMetadataByType[type][0].id);
  };

  ['aparelho', 'etiqueta', 'antes', 'depois', 'instalacao_antes', 'instalacao_depois', 'assinatura', 'entrega', 'verificacao', 'aparelho_recuperado', 'visita'].forEach(addLatestId);
  if (photoMetadataByType['estado']) {
    photoMetadataByType['estado'].slice(0, 3).forEach(p => idsToFetch.push(p.id));
  }

  // Fetch actual URLs for identified photos
  let photos: any[] = [];
  if (idsToFetch.length > 0) {
    const { data: fetchedPhotos } = await supabase
      .from('service_photos')
      .select('photo_type, file_url, uploaded_at')
      .in('id', idsToFetch)
      .order('uploaded_at', { ascending: false });
    photos = fetchedPhotos ?? [];
  }

  const photosByType: Record<string, string[]> = {};
  for (const photo of photos) {
    if (!photosByType[photo.photo_type]) photosByType[photo.photo_type] = [];
    photosByType[photo.photo_type].push(photo.file_url);
  }

  const latestPhoto = (type: string) => photosByType[type]?.[0] ?? null;
  const allPhotos = (type: string) => photosByType[type] ?? [];

  const detectedFault = (service.detected_fault as string) || '';
  const workPerformed = (service.work_performed as string) || '';
  const flowStep = (service.flow_step as string) || '';
  const status = (service.status as string) || '';

  // Status that imply the service has already passed the initial entry/photos phase
  const isInProgress = ['em_execucao', 'na_oficina', 'para_pedir_peca', 'em_espera_de_peca', 'concluido'].includes(status);

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

  const dbSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveStateToDb = useCallback((currentStep: string, formData?: T) => {
    // Debounce: cancel previous pending save and schedule a new one in 2s
    if (dbSaveTimerRef.current) {
      clearTimeout(dbSaveTimerRef.current);
    }
    dbSaveTimerRef.current = setTimeout(async () => {
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
    }, 2000);
  }, [serviceId]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (dbSaveTimerRef.current) {
        clearTimeout(dbSaveTimerRef.current);
      }
    };
  }, []);

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
