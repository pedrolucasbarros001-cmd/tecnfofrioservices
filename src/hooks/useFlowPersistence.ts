import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { technicianUpdateService } from '@/utils/technicianRpc';

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
 * Whitelist of valid steps per flow type.
 * Used to validate flow_step from DB before applying — prevents "ghost step" bug
 * where an invalid step causes no Dialog to match and the modal appears to close.
 */
const VALID_STEPS_BY_FLOW: Record<string, string[]> = {
  visita: ['resumo', 'deslocacao', 'foto', 'foto_aparelho', 'foto_etiqueta', 'foto_estado', 'produto', 'diagnostico', 'decisao', 'registo_artigos', 'resumo_reparacao', 'pecas_usadas', 'pedir_peca'],
  visita_continuacao: ['resumo_continuacao', 'confirmacao_peca', 'decisao', 'registo_artigos', 'resumo_reparacao', 'pecas_usadas', 'pedir_peca'],
  oficina: ['resumo', 'iniciar', 'foto_aparelho', 'foto_etiqueta', 'foto_estado', 'produto', 'diagnostico', 'registo_artigos', 'resumo_reparacao', 'pedir_peca', 'conclusao'],
  oficina_continuacao: ['resumo_continuacao', 'confirmacao_peca', 'conclusao'],
  instalacao: ['resumo', 'deslocacao', 'foto_antes', 'materiais', 'trabalho', 'foto_depois', 'finalizacao'],
  entrega: ['resumo', 'deslocacao', 'foto', 'finalizacao'],
};

/** Returns true if the step is valid for the given flow type */
export function isValidStepForFlow(step: string, flowType: FlowState['flowType']): boolean {
  const validSteps = VALID_STEPS_BY_FLOW[flowType];
  if (!validSteps) return false;
  return validSteps.includes(step);
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
  // Wrap with 8s timeout to prevent infinite loading
  const timeoutPromise = new Promise<DbResumeResult>((_, reject) =>
    setTimeout(() => reject(new Error('deriveStepFromDb timeout')), 8000)
  );

  return Promise.race([
    _deriveStepFromDbImpl(serviceId, flowType, service),
    timeoutPromise,
  ]).catch((error) => {
    console.error('deriveStepFromDb failed or timed out:', error);
    return { step: 'resumo', formDataOverrides: {} };
  });
}

async function _deriveStepFromDbImpl(
  serviceId: string,
  flowType: FlowState['flowType'],
  service: Record<string, unknown>
): Promise<DbResumeResult> {
  try {
    // Parallel fetch: service snapshot + photos metadata + parts
    const [serviceResult, photoMetaResult, partsResult] = await Promise.all([
      supabase
        .from('services')
        .select('id, status, flow_step, detected_fault, work_performed, brand, model, serial_number, appliance_type, pnc, service_type')
        .eq('id', serviceId)
        .maybeSingle(),
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

    if (photoMetaResult.error) throw photoMetaResult.error;
    if (partsResult.error) throw partsResult.error;

    const serviceSnapshot = (serviceResult.data as Record<string, unknown> | null) ?? service;
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

    // Use __photo_exists__ markers instead of fetching actual file_url (avoids 4-5MB base64 transfers)
    const PHOTO_MARKER = '__photo_exists__';
    const latestPhoto = (type: string) => hasPhoto(type) ? PHOTO_MARKER : null;
    const allPhotos = (type: string) => {
      const count = photoMetadataByType[type]?.length ?? 0;
      return count > 0 ? Array(Math.min(count, 3)).fill(PHOTO_MARKER) : [];
    };

    const detectedFault = (serviceSnapshot.detected_fault as string) || '';
    const workPerformed = (serviceSnapshot.work_performed as string) || '';
    const flowStep = (serviceSnapshot.flow_step as string) || '';
    const status = (serviceSnapshot.status as string) || '';

    // Status that imply the service has already passed the initial entry/photos phase
    const isInProgress = ['em_execucao', 'na_oficina', 'para_pedir_peca', 'em_espera_de_peca', 'concluidos'].includes(status);

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
        productBrand: serviceSnapshot.brand || "",
        productModel: serviceSnapshot.model || "",
        productSerial: serviceSnapshot.serial_number || "",
        productPNC: (serviceSnapshot as any).pnc || "",
        productType: serviceSnapshot.appliance_type || "",
      };

      if (flowType === 'oficina_continuacao') {
        return { step: 'confirmacao_peca', formDataOverrides };
      }

      // Prioritize explicit flow_step from DB, but validate it belongs to this flow
      const isStalePhotoStep = flowStep && ['foto_aparelho', 'foto_etiqueta', 'foto_estado'].includes(flowStep);
      const hasHistory = !!(detectedFault || serviceSnapshot.work_performed || isInProgress);
      const isValidForThisFlow = flowStep ? isValidStepForFlow(flowStep, flowType) : false;
      if (flowStep && flowStep !== 'resumo' && flowStep !== 'resumo_continuacao' && isValidForThisFlow && !(isStalePhotoStep && hasHistory)) {
        return { step: flowStep, formDataOverrides };
      }

      // Skip initial photos if service has history (came from visit, forced state, etc.)
      // or if it's already in progress with existing photos
      const skipInitialPhotos = hasHistory || (isInProgress && hasAnyPhoto);

      if (!skipInitialPhotos) {
        if (!hasPhoto('aparelho')) return { step: 'foto_aparelho', formDataOverrides };
        if (!hasPhoto('etiqueta')) return { step: 'foto_etiqueta', formDataOverrides };
        if (!hasPhoto('estado')) return { step: 'foto_estado', formDataOverrides };
      }

      const hasProductInfo = !!(serviceSnapshot.brand && serviceSnapshot.model);
      if (!hasProductInfo) return { step: 'produto', formDataOverrides };

      if (!detectedFault) return { step: 'diagnostico', formDataOverrides };
      if (hasRequestedPart) return { step: 'conclusao', formDataOverrides };
      if (!workPerformed) return { step: 'registo_artigos', formDataOverrides };
      return { step: 'conclusao', formDataOverrides };
    }

    // --- VISIT FLOW ---
    if (flowType === 'visita' || flowType === 'visita_continuacao') {
      const serviceType = (serviceSnapshot.service_type as string) || '';
      const isReparacao = serviceType === 'reparacao';

      const formDataOverrides: Record<string, unknown> = {
        detectedFault,
        photoAparelho: latestPhoto('aparelho'),
        photoEtiqueta: latestPhoto('etiqueta'),
        photosEstado: allPhotos('estado'),
        photoFile: latestPhoto('visita'),
        usedPartsList,
        usedParts: usedPartsList.length > 0,
        productBrand: serviceSnapshot.brand || "",
        productModel: serviceSnapshot.model || "",
        productSerial: serviceSnapshot.serial_number || "",
        productPNC: (serviceSnapshot as any).pnc || "",
        productType: serviceSnapshot.appliance_type || "",
      };

      if (flowType === 'visita_continuacao') {
        return { step: 'confirmacao_peca', formDataOverrides };
      }

      // Prioritize explicit flow_step from DB, but validate it belongs to this flow
      const isValidForThisFlow = flowStep ? isValidStepForFlow(flowStep, flowType) : false;
      if (flowStep && flowStep !== 'resumo' && flowStep !== 'resumo_continuacao' && isValidForThisFlow) {
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

        const hasProductInfo = !!(serviceSnapshot.brand && serviceSnapshot.model);
        if (!hasProductInfo) return { step: 'produto', formDataOverrides };

        if (!detectedFault) return { step: 'diagnostico', formDataOverrides };
        if (hasRequestedPart) return { step: 'pedir_peca', formDataOverrides };
        return { step: 'decisao', formDataOverrides };
      } else {
        if (!hasPhoto('visita')) return { step: 'foto', formDataOverrides };

        const hasProductInfo = !!(serviceSnapshot.brand && serviceSnapshot.model);
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
  } catch (error) {
    console.error('Error deriving step from DB:', error);
    return { step: 'resumo', formDataOverrides: {} };
  }
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
  const lastPersistedStepRef = useRef<string | null>(null);
  const lastPersistedPayloadRef = useRef<string | null>(null);

  // Sanitize formData: replace base64 photo strings with placeholder to avoid huge DB payloads
  const sanitizeFormData = useCallback((formData?: T): Record<string, unknown> | null => {
    if (!formData) return null;
    const cleanData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string' && value.startsWith('data:image/')) {
        cleanData[key] = '__photo_exists__';
      } else if (Array.isArray(value) && value.some(v => typeof v === 'string' && (v as string).startsWith('data:image/'))) {
        cleanData[key] = value.map(v =>
          typeof v === 'string' && v.startsWith('data:image/') ? '__photo_exists__' : v
        );
      } else {
        cleanData[key] = value;
      }
    }
    return cleanData;
  }, []);

  const persistStepToDb = useCallback(async (currentStep: string | null, formData?: T) => {
    const cleanData = sanitizeFormData(formData);
    const { error } = await technicianUpdateService({
      serviceId,
      flowStep: currentStep,
      flowData: cleanData,
    });

    if (error) throw error;
  }, [serviceId, sanitizeFormData]);

  const saveStateToDb = useCallback((currentStep: string | null, formData?: T) => {
    const serializedPayload = JSON.stringify(sanitizeFormData(formData));
    const hasSameStep = currentStep === lastPersistedStepRef.current;
    const hasSamePayload = serializedPayload === lastPersistedPayloadRef.current;

    // Avoid redundant writes for identical state (reduces lag / trigger queue)
    if (hasSameStep && hasSamePayload) {
      return;
    }

    // Persist immediately when a new step is reached (prevents "passo fantasma")
    if (!hasSameStep) {
      lastPersistedStepRef.current = currentStep;
      lastPersistedPayloadRef.current = serializedPayload;
      persistStepToDb(currentStep, formData).catch((error) => {
        console.error('Error persisting flow step to DB:', error);
      });
    }

    // Debounce additional form-data updates for same step
    if (dbSaveTimerRef.current) {
      clearTimeout(dbSaveTimerRef.current);
    }

    dbSaveTimerRef.current = setTimeout(async () => {
      try {
        await persistStepToDb(currentStep, formData);
        lastPersistedStepRef.current = currentStep;
        lastPersistedPayloadRef.current = serializedPayload;
      } catch (error) {
        // Log error but don't crash, will try again on next change
        console.error('Silent auto-save failed:', error);
      }
    }, 1000); // 1s debounce to prevent DB spam
  }, [persistStepToDb, sanitizeFormData]);

  // Flush immediately (no debounce) — call when modal closes
  const flushStateToDb = useCallback(async (currentStep: string | null, formData?: T) => {
    if (dbSaveTimerRef.current) {
      clearTimeout(dbSaveTimerRef.current);
      dbSaveTimerRef.current = null;
    }

    try {
      lastPersistedStepRef.current = currentStep;
      await persistStepToDb(currentStep, formData);
    } catch (error) {
      console.error('Error flushing flow state to DB:', error);
    }
  }, [persistStepToDb]);

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

  return { isLoaded, loadState, saveState, saveStateToDb, flushStateToDb, clearState, hasSavedState };
}
