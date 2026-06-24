import React, { useState, useEffect } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { BuildingMeasurements, RoomEntry } from '../types';

const CALIBRATION_STATE_KEY = 'aa2000_calibration_state_v1';
GlobalWorkerOptions.workerSrc = pdfWorker;

interface Props {
  initialData?: BuildingMeasurements;
  onChange: (data: BuildingMeasurements) => void;
  onNewUpload?: () => void;
  activeVoiceField: string | null;
  startVoiceInput: (field: string, setter: (val: any) => void, isNumeric?: boolean) => void;
}

const FloorPlanManager: React.FC<Props> = ({ initialData, onChange, onNewUpload, activeVoiceField, startVoiceInput }) => {
  const [method, setMethod] = useState<'PLAN_UPLOAD' | 'MANUAL_ROOMS'>(initialData?.method || 'PLAN_UPLOAD');
  const [planImages, setPlanImages] = useState<string[]>(() => {
    if (initialData?.planImages?.length) return initialData.planImages;
    if (initialData?.planImage) return [initialData.planImage];
    return [];
  });
  const [knownDim, setKnownDim] = useState<number>(initialData?.planScale?.knownDimensionMeters || 0);
  const [detectedReferenceMeters, setDetectedReferenceMeters] = useState<number>(initialData?.planScale?.detectedReferenceMeters || 0);
  const [referenceLengthCm, setReferenceLengthCm] = useState<number>(initialData?.planScale?.referenceLengthCm || 0);
  const [confirmedMeasurementMeters, setConfirmedMeasurementMeters] = useState<number>(initialData?.planScale?.confirmedMeasurementMeters || initialData?.planScale?.knownDimensionMeters || 0);
  const [scaleMetersPerCm, setScaleMetersPerCm] = useState<number>(initialData?.planScale?.scaleMetersPerCm || 0);
  const [calibrationConfirmed, setCalibrationConfirmed] = useState<boolean>(!!initialData?.planScale?.calibrationConfirmed);
  const [appliedLayoutElements, setAppliedLayoutElements] = useState<NonNullable<BuildingMeasurements['planScale']>['appliedLayoutElements']>(
    initialData?.planScale?.appliedLayoutElements || []
  );
  const [rooms, setRooms] = useState<RoomEntry[]>(initialData?.rooms || []);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Partial<RoomEntry>>({ name: '', length: 0, width: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const addMoreInputRef = React.useRef<HTMLInputElement>(null);

  // State for AI-powered scale detection
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [hasDetected, setHasDetected] = useState(false);
  const [roomsDetected, setRoomsDetected] = useState(false);
  const [applyScaleNotice, setApplyScaleNotice] = useState<string>('');
  const [calibrationUnit, setCalibrationUnit] = useState<'m' | 'ft'>('m');
  const [calibrationError, setCalibrationError] = useState('');
  const [analysisError, setAnalysisError] = useState('');

  const buildFallbackRoomsFromPlan = (): RoomEntry[] => {
    const pageCount = Math.max(1, planImages.length);
    return Array.from({ length: pageCount }).map((_, index) => {
      const length = 5;
      const width = 5;
      return {
        id: Math.random().toString(36).substr(2, 9),
        name: `Floor Plan Zone ${index + 1}`,
        length,
        width,
        area: length * width
      };
    });
  };

  const convertPdfToImageDataUrls = async (file: File): Promise<string[]> => {
    const buffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: buffer }).promise;
    const urls: string[] = [];
    const maxPages = Math.min(pdf.numPages, 6);

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport, canvas }).promise;
      urls.push(canvas.toDataURL('image/png'));
    }

    return urls;
  };

  useEffect(() => {
    const fallbackRooms =
      method === 'PLAN_UPLOAD' && planImages.length > 0 && rooms.length === 0
        ? buildFallbackRoomsFromPlan()
        : [];
    const effectiveRooms = rooms.length > 0 ? rooms : fallbackRooms;
    const total = effectiveRooms.reduce((acc, r) => acc + (r.area || 0), 0);
    const hasCalibrationData =
      knownDim > 0 ||
      detectedReferenceMeters > 0 ||
      referenceLengthCm > 0 ||
      confirmedMeasurementMeters > 0 ||
      scaleMetersPerCm > 0 ||
      calibrationConfirmed ||
      (appliedLayoutElements?.length || 0) > 0;
    onChange({
      method,
      planImage: planImages[0] || undefined,
      planImages: planImages.length > 0 ? planImages : undefined,
      planScale: hasCalibrationData
        ? {
            knownDimensionMeters: knownDim,
            ...(detectedReferenceMeters > 0 ? { detectedReferenceMeters } : {}),
            ...(referenceLengthCm > 0 ? { referenceLengthCm } : {}),
            ...(confirmedMeasurementMeters > 0 ? { confirmedMeasurementMeters } : {}),
            ...(scaleMetersPerCm > 0 ? { scaleMetersPerCm } : {}),
            ...(calibrationConfirmed ? { calibrationConfirmed: true } : {}),
            ...(appliedLayoutElements && appliedLayoutElements.length > 0 ? { appliedLayoutElements } : {})
          }
        : undefined,
      rooms: effectiveRooms,
      totalArea: total
    });
  }, [
    method,
    planImages,
    knownDim,
    detectedReferenceMeters,
    referenceLengthCm,
    confirmedMeasurementMeters,
    scaleMetersPerCm,
    calibrationConfirmed,
    appliedLayoutElements,
    rooms
  ]);

  useEffect(() => {
    if (referenceLengthCm > 0 && confirmedMeasurementMeters > 0) {
      setScaleMetersPerCm(confirmedMeasurementMeters / referenceLengthCm);
    } else {
      setScaleMetersPerCm(0);
    }
  }, [referenceLengthCm, confirmedMeasurementMeters]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CALIBRATION_STATE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { unit?: 'm' | 'ft' };
      if (saved.unit === 'm' || saved.unit === 'ft') {
        setCalibrationUnit(saved.unit);
      }
    } catch {
      // ignore local calibration read errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CALIBRATION_STATE_KEY, JSON.stringify({ unit: calibrationUnit, scaleMetersPerCm }));
    } catch {
      // ignore local calibration write errors
    }
  }, [calibrationUnit, scaleMetersPerCm]);

  /**
   * AI-Powered Scale Detection
   * Uses Gemini Vision to analyze all uploaded floor plan images.
   */
  useEffect(() => {
    if (planImages.length > 0 && !knownDim && !hasDetected && !isAnalyzing) {
      handleAnalyzeScale();
    }
  }, [planImages.length]);

  const handleAnalyzeScale = async () => {
    if (planImages.length === 0) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisError('');

    const interval = setInterval(() => {
      setAnalysisProgress(prev => (prev >= 90 ? 90 : prev + 10));
    }, 200);

    try {
      const apiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GROK_API_KEY)
        ? String(import.meta.env.VITE_GROK_API_KEY)
        : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY)
          ? String(import.meta.env.VITE_API_KEY)
          : '';
      const envModel = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GROK_MODEL)
        ? String(import.meta.env.VITE_GROK_MODEL).trim()
        : '';
      const envBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GROK_BASE_URL)
        ? String(import.meta.env.VITE_GROK_BASE_URL).trim().replace(/\/$/, '')
        : '';
      // Groq API keys start with gsk_; they must use api.groq.com, not api.x.ai.
      const isGroqKey = /^gsk_/i.test(apiKey.trim());
      const GROQ_BASE = 'https://api.groq.com/openai/v1';
      const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
      const XAI_BASE = 'https://api.x.ai/v1';
      const XAI_VISION_MODEL = 'grok-2-vision-1212';

      let grokBaseUrl = envBase;
      let grokModel = envModel;
      if (isGroqKey) {
        if (!grokBaseUrl || grokBaseUrl.includes('api.x.ai')) grokBaseUrl = GROQ_BASE;
        if (!grokModel || /^grok/i.test(grokModel)) grokModel = GROQ_VISION_MODEL;
      } else {
        if (!grokBaseUrl) grokBaseUrl = XAI_BASE;
        if (!grokModel || grokModel === 'grok-2-vision-latest') grokModel = XAI_VISION_MODEL;
      }
      if (!apiKey) {
        throw new Error('Missing VITE_GROK_API_KEY (or VITE_API_KEY) for floor plan analysis');
      }
      const promptText = "Examine ALL of the following floor plan image(s). The scale bar or numerical dimensions (e.g. '1:100', '12m', '25ft') may appear on ANY image—e.g. only on the second or third image. You MUST check every image before concluding no scale is present.\n1. Look in every image for: a calibrated ruler/scale bar, or wall segments with numerical dimensions.\n2. If you find dimensions on any image, set hasScale true and set suggestedValue to that number (convert to meters: 1 ft = 0.3048 m).\n3. Identify all rooms/hallways/zones across every image; extract names and dimensions if written.\n4. Combine room lists without duplicates.\nReturn strict JSON only with this schema: {\"hasScale\": boolean, \"suggestedValue\": number, \"unit\": string, \"rooms\": [{\"name\": string, \"length\": number, \"width\": number}]}.";
      const contentParts: any[] = [{ type: 'text', text: promptText }];
      const imagePlans = planImages.filter(img => {
        const m = img.split(';')[0].split(':')[1] || '';
        return m.startsWith('image/');
      });
      const toSend = imagePlans.length > 0 ? imagePlans : planImages;
      for (const img of toSend) {
        if (!img.startsWith('data:image/')) continue;
        contentParts.push({
          type: 'image_url',
          image_url: { url: img }
        });
      }
      if (contentParts.length <= 1) {
        setHasDetected(false);
        setKnownDim(0);
        setIsAnalyzing(false);
        clearInterval(interval);
        return;
      }

      const response = await fetch(`${grokBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: grokModel,
          temperature: 0,
          messages: [
            {
              role: 'system',
              content: 'You extract structured floor-plan data. Return valid JSON only.'
            },
            {
              role: 'user',
              content: contentParts
            }
          ]
        })
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Vision API error ${response.status}: ${errText}`);
      }
      const payload = await response.json();
      const rawContent = payload?.choices?.[0]?.message?.content;
      const modelText = typeof rawContent === 'string'
        ? rawContent
        : Array.isArray(rawContent)
          ? rawContent
              .map((part: any) => {
                if (typeof part === 'string') return part;
                if (typeof part?.text === 'string') return part.text;
                return '';
              })
              .join('\n')
          : '';
      if (!modelText.trim()) {
        throw new Error('Vision API response did not contain usable text content');
      }

      const withoutCodeFence = modelText.replace(/```json|```/gi, '').trim();
      const objectMatch = withoutCodeFence.match(/\{[\s\S]*\}/);
      const jsonText = objectMatch ? objectMatch[0] : withoutCodeFence;
      const result = JSON.parse(jsonText);
      
      setAnalysisProgress(100);
      clearInterval(interval);

      if (result.hasScale && result.suggestedValue > 0) {
        setHasDetected(true);
        setKnownDim(result.suggestedValue);
        setDetectedReferenceMeters(result.suggestedValue);
        setConfirmedMeasurementMeters(result.suggestedValue);
      } else {
        setHasDetected(false);
        setKnownDim(0);
        setDetectedReferenceMeters(0);
      }

      if (Array.isArray(result.rooms) && result.rooms.length > 0) {
        setRoomsDetected(true);
        const detectedRooms: RoomEntry[] = result.rooms
          .map((r: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: String(r?.name || '').trim(),
            length: Number(r?.length) || 0,
            width: Number(r?.width) || 0,
            area: (Number(r?.length) || 0) * (Number(r?.width) || 0)
          }))
          .filter((r: RoomEntry) => !!r.name && r.length > 0 && r.width > 0);
        setRooms(prev => {
          const byName = new Set(prev.map((r) => r.name.trim().toLowerCase()));
          const uniqueNew = detectedRooms.filter((r) => !byName.has(r.name.trim().toLowerCase()));
          return [...prev, ...uniqueNew];
        });
      } else {
        // Fallback: preserve estimation flow when uploaded plans have no parseable labels/dimensions.
        const fallbackRooms = buildFallbackRoomsFromPlan();
        if (fallbackRooms.length > 0) {
          setRoomsDetected(true);
          setRooms((prev) => (prev.length > 0 ? prev : fallbackRooms));
        }
      }
    } catch (err) {
      console.error("Scale detection failed", err);
      const message = err instanceof Error ? err.message : 'Floor plan analysis failed';
      setAnalysisError(message);
      setHasDetected(false);
      setKnownDim(0);
      const fallbackRooms = buildFallbackRoomsFromPlan();
      if (fallbackRooms.length > 0) {
        setRoomsDetected(true);
        setRooms((prev) => (prev.length > 0 ? prev : fallbackRooms));
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const processFiles = async (files: FileList | File[], append = false) => {
    const list = Array.from(files || []).filter(f => /^image\//.test(f.type) || f.type === 'application/pdf');
    if (list.length === 0) return;
    if (!append) {
      setHasDetected(false);
      setKnownDim(0);
      setDetectedReferenceMeters(0);
      setReferenceLengthCm(0);
      setConfirmedMeasurementMeters(0);
      setScaleMetersPerCm(0);
      setCalibrationConfirmed(false);
      setAppliedLayoutElements([]);
      setRoomsDetected(false);
      setRooms([]);
    }
    try {
      const urlBatches = await Promise.all(
        list.map((file) => {
          if (file.type === 'application/pdf') {
            return convertPdfToImageDataUrls(file);
          }
          return new Promise<string[]>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve([(reader.result as string) || '']);
            reader.readAsDataURL(file);
          });
        })
      );

      const newUrls = urlBatches.flat().filter(Boolean);
      if (newUrls.length === 0) return;
      if (append) {
        setPlanImages(prev => [...prev, ...newUrls]);
      } else {
        setPlanImages(newUrls);
      }
      if (onNewUpload) onNewUpload();
    } catch (error) {
      console.error('Floor plan preprocessing failed', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, append = false) => {
    const files = e.target.files;
    if (!files?.length) return;
    void processFiles(files, append);
    e.target.value = '';
  };

  const handleAddMore = () => {
    addMoreInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (!files?.length) return;
    void processFiles(files);
  };

  const addRoom = () => {
    if (!currentRoom.name || !currentRoom.length || !currentRoom.width) return;
    const newRoom: RoomEntry = {
      id: Math.random().toString(36).substr(2, 9),
      name: currentRoom.name,
      length: currentRoom.length,
      width: currentRoom.width,
      area: currentRoom.length * currentRoom.width
    };
    setRooms([...rooms, newRoom]);
    setCurrentRoom({ name: '', length: 0, width: 0 });
    setShowRoomModal(false);
  };

  const handleConfirmCalibration = () => {
    if (confirmedMeasurementMeters <= 0 || referenceLengthCm <= 0) {
      setCalibrationError('Real value and measured value must be greater than zero.');
      return;
    }
    setCalibrationError('');
    if (confirmedMeasurementMeters > 0) {
      setKnownDim(confirmedMeasurementMeters);
    }
    setCalibrationConfirmed(true);
    const mapped = rooms.map((r) => ({
      id: r.id,
      name: r.name,
      rawLengthCm: r.length,
      scaledLengthM: Number((r.length * scaleMetersPerCm).toFixed(3))
    }));
    setAppliedLayoutElements(mapped);
    setApplyScaleNotice(
      mapped.length > 0
        ? `Scale applied to ${mapped.length} layout element${mapped.length > 1 ? 's' : ''}.`
        : 'Calibration confirmed. Add room entries to apply scale to layout elements.'
    );
  };

  const handleRecalibrate = () => {
    setCalibrationConfirmed(false);
    setAppliedLayoutElements([]);
    setApplyScaleNotice('');
    setCalibrationError('');
    setKnownDim(0);
    setDetectedReferenceMeters(0);
    setReferenceLengthCm(0);
    setConfirmedMeasurementMeters(0);
    setScaleMetersPerCm(0);
    setHasDetected(false);
  };

  const handleApplyScaleToLayoutElements = () => {
    if (scaleMetersPerCm <= 0) return;
    const mapped = rooms.map((r) => ({
      id: r.id,
      name: r.name,
      rawLengthCm: r.length,
      scaledLengthM: Number((r.length * scaleMetersPerCm).toFixed(3))
    }));
    setAppliedLayoutElements(mapped);
    setApplyScaleNotice(
      mapped.length > 0
        ? `Scale applied to ${mapped.length} layout element${mapped.length > 1 ? 's' : ''}.`
        : 'No rooms yet. Add room entries, then apply scale again.'
    );
  };

  const liveCalibratedPreview = rooms.slice(0, 6).map((room) => ({
    id: room.id,
    name: room.name,
    original: room.length,
    calibrated: room.length * scaleMetersPerCm,
  }));

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex bg-slate-100 p-1 rounded-2xl">
        <button 
          onClick={() => setMethod('PLAN_UPLOAD')}
          className={`flex-1 py-3 text-[10px] font-black rounded-xl transition ${method === 'PLAN_UPLOAD' ? 'bg-blue-900 text-white shadow-md' : 'text-slate-400'}`}
        >
          PLAN UPLOAD
        </button>
        <button 
          onClick={() => setMethod('MANUAL_ROOMS')}
          className={`flex-1 py-3 text-[10px] font-black rounded-xl transition ${method === 'MANUAL_ROOMS' ? 'bg-blue-900 text-white shadow-md' : 'text-slate-400'}`}
        >
          ROOM LIST (MANUAL)
        </button>
      </div>

      {method === 'PLAN_UPLOAD' && (
        <div className="space-y-3 animate-fade-in">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Floor Plan (PDF/IMG)</label>
            <div className="relative transition-all duration-300 rounded-xl overflow-hidden">
              {planImages.length > 0 ? (
                <>
                  {/* List layout: icon left, name right, one row per file */}
                  <div className="space-y-2">
                    {planImages.map((dataUrl, index) => {
                      const isPdf = dataUrl.startsWith('data:application/pdf');
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm"
                        >
                          {/* Icon: square with border */}
                          <div className="w-12 h-12 rounded border-2 border-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center bg-slate-100">
                            {isPdf ? (
                              <span className="text-[10px] font-black text-slate-500 uppercase">PDF</span>
                            ) : (
                              <img src={dataUrl} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          {/* File name */}
                          <span className="flex-1 text-[10px] font-black text-slate-900 uppercase min-w-0 truncate">
                            Floor Plan {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = planImages.filter((_, i) => i !== index);
                              setPlanImages(next);
                              if (next.length === 0) {
                                setKnownDim(0);
                                setDetectedReferenceMeters(0);
                                setReferenceLengthCm(0);
                                setConfirmedMeasurementMeters(0);
                                setScaleMetersPerCm(0);
                                setCalibrationConfirmed(false);
                                setAppliedLayoutElements([]);
                                setHasDetected(false);
                                setRoomsDetected(false);
                                setRooms([]);
                              }
                            }}
                            className="w-8 h-8 rounded-full border-2 border-slate-300 bg-slate-100 hover:bg-red-50 hover:border-red-400 text-slate-600 hover:text-red-600 flex items-center justify-center transition flex-shrink-0"
                            aria-label="Remove"
                          >
                            <i className="fas fa-times text-xs"></i>
                          </button>
                        </div>
                      );
                    })}
                    {/* Add More row */}
                    <button
                      type="button"
                      onClick={handleAddMore}
                      className="w-full flex items-center gap-3 p-2.5 bg-white text-slate-900 rounded-lg border-2 border-slate-200 hover:bg-slate-50 active:scale-[0.99] transition"
                    >
                      <div className="w-12 h-12 rounded flex-shrink-0 flex items-center justify-center bg-blue-900 text-white">
                        <i className="fas fa-plus text-lg"></i>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">ADD MORE</span>
                      <input
                        ref={addMoreInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        multiple
                        onChange={e => handleFileUpload(e, true)}
                      />
                    </button>
                  </div>
                  {isAnalyzing && (
                    <div className="mt-2 p-2 bg-blue-900/10 rounded-lg flex items-center gap-2">
                      <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden flex-1">
                        <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${analysisProgress}%` }}></div>
                      </div>
                      <span className="text-[9px] font-black text-slate-600 uppercase shrink-0">Analyzing...</span>
                    </div>
                  )}
                  {!isAnalyzing && (hasDetected || roomsDetected) && (
                    <div className="mt-2 flex items-center gap-1.5 p-1.5 bg-green-500 text-white rounded-lg text-[9px] font-black uppercase">
                      <i className="fas fa-check-circle text-[8px]"></i>
                      {hasDetected && roomsDetected ? 'Scale & Rooms Detected' : hasDetected ? 'Scale Detected' : 'Rooms Detected'}
                    </div>
                  )}
                  {!!analysisError && (
                    <div className="mt-2 p-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-[9px] font-black uppercase">
                      Analysis failed: {analysisError}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-[2rem] overflow-hidden border-2 border-slate-200">
                  <label
                    className={`flex flex-col items-center justify-center w-full aspect-video max-h-[140px] border-2 border-dashed rounded-[2rem] cursor-pointer transition bg-white text-slate-400 group ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <i className="fas fa-file-upload text-4xl mb-3 group-hover:scale-110 transition"></i>
                    <span className="text-[10px] font-black uppercase tracking-widest">TAP TO UPLOAD PLAN</span>
                    <input type="file" accept="image/*,application/pdf" className="hidden" multiple onChange={e => handleFileUpload(e, false)} />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {method === 'MANUAL_ROOMS' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-6 rounded-2xl border-2 border-slate-100 bg-slate-50 transition-all duration-300 space-y-3 shadow-sm">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <i className="fas fa-ruler-combined text-blue-900"></i>
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-900">Calibration</h4>
                </div>
             </div>
             <p className="text-[10px] font-bold uppercase leading-tight text-slate-500">
               {hasDetected 
                ? "The system identified a scale reference from the plan dimensions. Review and confirm below."
                : "Enter the known length of the longest wall or a specific dimension on the plan for scale detection."}
             </p>
             <div className="relative">
                <input 
                  type="number"
                  min={0}
                  className="w-full border-2 border-slate-200 p-4 pr-12 rounded-xl font-black outline-none shadow-sm transition-all duration-300 bg-white text-blue-900 focus:border-blue-900 text-[10px]"
                  value={knownDim || ''}
                  onChange={e => {
                    const val = Math.max(0, parseFloat(e.target.value) || 0);
                    setKnownDim(val);
                    if (val > 0) setHasDetected(true);
                  }}
                />
                <button 
                  onClick={() => startVoiceInput('knownDim', (val) => {
                    const num = Math.max(0, parseFloat(val) || 0);
                    setKnownDim(num);
                    if (num > 0) setHasDetected(true);
                  }, true)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition ${activeVoiceField === 'knownDim' ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}
                >
                  <i className="fas fa-microphone text-lg"></i>
                </button>
             </div>
             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Measured Length (From Plan/Image)</label>
                 <div className="relative">
                   <input
                     type="number"
                     min={0}
                     className="w-full border-2 border-slate-200 p-4 pr-12 rounded-xl font-black outline-none shadow-sm transition-all duration-300 bg-white text-blue-900 focus:border-blue-900 text-[10px]"
                     value={referenceLengthCm || ''}
                     onChange={(e) => setReferenceLengthCm(Math.max(0, parseFloat(e.target.value) || 0))}
                   />
                   <button
                     type="button"
                     onClick={() => startVoiceInput('referenceLengthCm', (val) => setReferenceLengthCm(Math.max(0, parseFloat(val) || 0)), true)}
                     className={`absolute right-4 top-1/2 -translate-y-1/2 transition ${activeVoiceField === 'referenceLengthCm' ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}
                   >
                     <i className="fas fa-microphone text-lg"></i>
                   </button>
                 </div>
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reference Length (Real Value)</label>
                 <div className="relative">
                   <input
                     type="number"
                     min={0}
                     className="w-full border-2 border-slate-200 p-4 pr-12 rounded-xl font-black outline-none shadow-sm transition-all duration-300 bg-white text-blue-900 focus:border-blue-900 text-[10px]"
                     value={confirmedMeasurementMeters || ''}
                     onChange={(e) => setConfirmedMeasurementMeters(Math.max(0, parseFloat(e.target.value) || 0))}
                   />
                   <button
                     type="button"
                     onClick={() => startVoiceInput('confirmedMeasurementMeters', (val) => setConfirmedMeasurementMeters(Math.max(0, parseFloat(val) || 0)), true)}
                     className={`absolute right-4 top-1/2 -translate-y-1/2 transition ${activeVoiceField === 'confirmedMeasurementMeters' ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}
                   >
                     <i className="fas fa-microphone text-lg"></i>
                   </button>
                 </div>
               </div>
             </div>
             <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unit</span>
               <select
                 value={calibrationUnit}
                 onChange={(e) => setCalibrationUnit(e.target.value as 'm' | 'ft')}
                 className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-700 outline-none"
               >
                 <option value="m">Meters</option>
                 <option value="ft">Feet</option>
               </select>
             </div>
             <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">
               Formula: Scale = Real Length / Measured Length
               <span className="mt-1 block text-slate-700">
                 {confirmedMeasurementMeters > 0 && referenceLengthCm > 0
                   ? `${confirmedMeasurementMeters.toFixed(4)} / ${referenceLengthCm.toFixed(4)} = ${scaleMetersPerCm.toFixed(6)}`
                   : 'Provide valid values to compute scale ratio'}
               </span>
             </div>
             <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
               Scale Ratio: {scaleMetersPerCm > 0 ? `${scaleMetersPerCm.toFixed(6)}` : 'N/A'}
               {detectedReferenceMeters > 0 && (
                 <span className="block mt-1 text-slate-400">Detected Reference: {detectedReferenceMeters.toFixed(2)} m</span>
               )}
             </div>
             {calibrationError && (
               <p className="text-[10px] font-black uppercase tracking-wide text-red-500">{calibrationError}</p>
             )}
             <div className="grid grid-cols-2 gap-2">
               <button
                 type="button"
                 onClick={handleConfirmCalibration}
                 disabled={confirmedMeasurementMeters <= 0 || referenceLengthCm <= 0}
                 className={`py-3 rounded-xl text-[10px] font-black border-2 transition ${
                   confirmedMeasurementMeters > 0 && referenceLengthCm > 0
                     ? 'bg-blue-900 text-white border-blue-900 shadow-md'
                     : 'bg-slate-100 text-slate-400 border-slate-200'
                 }`}
               >
                CALCULATE CALIBRATION
               </button>
               <button
                 type="button"
                 onClick={handleRecalibrate}
                 className="py-3 rounded-xl text-[10px] font-black border-2 transition bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
               >
                 RECALIBRATE
               </button>
             </div>
             <button
               type="button"
               onClick={handleApplyScaleToLayoutElements}
               disabled={scaleMetersPerCm <= 0}
               className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wide border-2 transition ${
                 scaleMetersPerCm > 0
                   ? 'bg-blue-900 text-white border-blue-900 shadow-md active:scale-[0.99] hover:bg-blue-950'
                   : 'cursor-not-allowed border-slate-300 bg-white text-slate-400'
               }`}
             >
               APPLY SCALE TO LAYOUT ELEMENTS
             </button>
             {applyScaleNotice && (
               <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-blue-900">
                 {applyScaleNotice}
               </div>
             )}
             <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-1">
               <p className="text-[10px] font-black uppercase tracking-widest text-emerald-900">Real-time Calibration Preview</p>
               {liveCalibratedPreview.length === 0 ? (
                 <p className="text-[10px] font-bold text-emerald-800">Add rooms to preview calibrated dimensions.</p>
               ) : (
                 liveCalibratedPreview.map((row) => (
                   <p key={row.id} className="text-[10px] font-bold text-emerald-900">
                    {row.name}: Original {row.original.toFixed(2)} {calibrationUnit} {'->'} Calibrated {row.calibrated.toFixed(2)} {calibrationUnit}
                   </p>
                 ))
               )}
             </div>
             {appliedLayoutElements.length > 0 && (
               <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                 <p className="text-[10px] font-black uppercase tracking-widest text-blue-900">
                   Scaled Elements ({appliedLayoutElements.length})
                 </p>
                 {appliedLayoutElements.slice(0, 4).map((el) => (
                   <p key={el.id} className="text-[10px] font-bold uppercase text-slate-500">
                     {el.name}: {el.rawLengthCm.toFixed(1)} cm to {el.scaledLengthM.toFixed(2)} m
                   </p>
                 ))}
                 {appliedLayoutElements.length > 4 && (
                   <p className="text-[10px] font-bold uppercase text-slate-400">
                     +{appliedLayoutElements.length - 4} more elements
                   </p>
                 )}
               </div>
             )}
          </div>

          <div className="flex justify-between items-center mb-2">
            <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest ml-1">Room-by-Room Inventory</h4>
            <button 
              onClick={() => setShowRoomModal(true)}
              className="px-4 py-2 bg-blue-900 text-white rounded-lg text-[10px] font-black uppercase shadow-lg active:scale-95 transition"
            >
              ADD ROOM
            </button>
          </div>

          {rooms.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-slate-200 rounded-[2rem] text-center bg-slate-50">
              <i className="fas fa-door-open text-3xl text-slate-200 mb-3"></i>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No rooms added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map(room => (
                <div key={room.id} className="p-5 bg-white border-2 border-slate-100 rounded-2xl flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-black text-blue-900 uppercase text-[10px]">{room.name}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">
                        {Math.floor(room.length * 3.28084)}'{Math.round((room.length * 3.28084 % 1) * 12)}" × {Math.floor(room.width * 3.28084)}'{Math.round((room.width * 3.28084 % 1) * 12)}" • {(room.area * 10.7639).toFixed(1)} SQFT / {room.area.toFixed(2)} SQM
                      </p>
                    </div>
                   <button onClick={() => setRooms(rooms.filter(r => r.id !== room.id))} className="text-red-500 w-10 h-10 hover:bg-red-50 rounded-full transition">
                     <i className="fas fa-trash-alt"></i>
                   </button>
                </div>
              ))}
              <div className="p-4 bg-blue-900 text-white rounded-2xl flex justify-between items-center shadow-xl">
                 <span className="text-[10px] font-black uppercase tracking-widest">Aggregated Area</span>
                 <div className="text-right">
                   <div className="text-[10px] font-black">{(rooms.reduce((acc, r) => acc + r.area, 0) * 10.7639).toLocaleString(undefined, {maximumFractionDigits: 1})} SQFT</div>
                   <div className="text-[10px] font-bold opacity-70">{rooms.reduce((acc, r) => acc + r.area, 0).toLocaleString()} SQM</div>
                 </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showRoomModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col scale-up">
            <header className="p-6 bg-white text-blue-900 flex justify-between items-center border-b border-slate-100">
              <h3 className="font-black uppercase tracking-widest text-[10px]">Define Room Detail</h3>
              <button onClick={() => setShowRoomModal(false)} className="text-slate-400 hover:text-blue-900 transition" aria-label="Close">
                <i className="fas fa-times text-lg"></i>
              </button>
            </header>
            <div className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Room Name</label>
                <div className="relative mt-1">
                  <input className="w-full bg-slate-50 border-2 border-slate-100 p-4 pr-12 rounded-xl font-bold text-[10px]"  value={currentRoom.name} onChange={e => setCurrentRoom({...currentRoom, name: e.target.value})} />
                  <button onClick={() => startVoiceInput('rName', (val) => setCurrentRoom({...currentRoom, name: val}))} className={`absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 ${activeVoiceField === 'rName' ? 'text-red-500 animate-pulse' : ''}`}><i className="fas fa-microphone"></i></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Length (m)</label>
                  <div className="relative mt-1">
                    <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 p-4 pr-10 rounded-xl font-bold text-center text-[10px]" value={currentRoom.length || ''} onChange={e => setCurrentRoom({...currentRoom, length: parseFloat(e.target.value) || 0})} />
                    <button onClick={() => startVoiceInput('rLen', (val) => setCurrentRoom({...currentRoom, length: parseFloat(val) || 0}), true)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><i className="fas fa-microphone text-xs"></i></button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Width (m)</label>
                  <div className="relative mt-1">
                    <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 p-4 pr-10 rounded-xl font-bold text-center text-[10px]" value={currentRoom.width || ''} onChange={e => setCurrentRoom({...currentRoom, width: parseFloat(e.target.value) || 0})} />
                    <button onClick={() => startVoiceInput('rWid', (val) => setCurrentRoom({...currentRoom, width: parseFloat(val) || 0}), true)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><i className="fas fa-microphone text-xs"></i></button>
                  </div>

                </div>
              </div>
              <button onClick={addRoom} className="w-full py-4 bg-blue-900 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest active:scale-95 transition text-[10px]">COMMIT ROOM</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default FloorPlanManager;
