import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Camera, CameraOff } from 'lucide-react';
import { clientNutritionFoodsFindByBarcode } from '@/generated/client-nutrition-foods/client-nutrition-foods';
import { JournalFlowHeader } from '@/features/client-nutrition/components/journal-flow-header';
import { useClientNutritionCopy } from '@/features/client-nutrition/copy';
import { ApiError } from '@/shared/errors/api-error';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { PageContainer } from '@/shared/ui/page';

const BARCODE = /^\d{8,14}$/;

/** Minimal typing for the native Barcode Detection API (Chromium, Android). */
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = { detect(source: CanvasImageSource): Promise<DetectedBarcode[]> };
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function barcodeDetectorConstructor(): BarcodeDetectorConstructor | null {
  const candidate = (globalThis as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
  return typeof candidate === 'function' ? candidate : null;
}

type LookupError = 'invalid' | 'notFound' | 'noData' | 'unavailable';

export function BarcodePage() {
  const copy = useClientNutritionCopy();
  const params = useSearch({ from: '/client/nutrition/barcode' });
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<LookupError | null>(null);
  const [looking, setLooking] = useState(false);
  const [camera, setCamera] = useState<'off' | 'on' | 'unsupported' | 'denied'>('off');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCamera((current) => (current === 'on' ? 'off' : current));
  }, []);

  const lookup = useCallback(
    async (value: string) => {
      const barcode = value.trim();
      if (!BARCODE.test(barcode)) {
        setError('invalid');
        return;
      }
      setError(null);
      setLooking(true);
      try {
        const food = await clientNutritionFoodsFindByBarcode(barcode);
        stopCamera();
        void navigate({
          to: '/client/nutrition/foods/$foodId',
          params: { foodId: food.id },
          search: { date: params.date, meal: params.meal },
        });
      } catch (caught) {
        const status = caught instanceof ApiError ? caught.statusCode : 0;
        setError(status === 404 ? 'notFound' : status === 422 ? 'noData' : status === 400 ? 'invalid' : 'unavailable');
      } finally {
        setLooking(false);
      }
    },
    [navigate, params.date, params.meal, stopCamera],
  );

  const startCamera = async () => {
    const Detector = barcodeDetectorConstructor();
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setCamera('unsupported');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCamera('on');
    } catch {
      setCamera('denied');
    }
  };

  // Attach the stream and scan a few times per second while the camera is on.
  useEffect(() => {
    const Detector = barcodeDetectorConstructor();
    const video = videoRef.current;
    if (camera !== 'on' || !Detector || !video || !streamRef.current) return;
    video.srcObject = streamRef.current;
    void video.play().catch(() => undefined);
    const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    let active = true;
    const timer = window.setInterval(() => {
      if (!active || video.readyState < 2) return;
      detector
        .detect(video)
        .then((codes) => {
          const found = codes.find((item) => BARCODE.test(item.rawValue));
          if (found && active) {
            active = false;
            setCode(found.rawValue);
            void lookup(found.rawValue);
          }
        })
        .catch(() => undefined);
    }, 350);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [camera, lookup]);

  useEffect(() => stopCamera, [stopCamera]);

  const message =
    error === 'invalid'
      ? copy.barcode.invalid
      : error === 'notFound'
        ? copy.barcode.notFound
        : error === 'noData'
          ? copy.barcode.noData
          : error === 'unavailable'
            ? copy.barcode.unavailable
            : null;

  return (
    <PageContainer density="client" className="mx-auto max-w-lg min-w-0">
      <JournalFlowHeader date={params.date} title={copy.barcode.title} />
      <p className="mb-5 text-sm text-muted-foreground">{copy.barcode.description}</p>

      <div className="client-surface-card mb-5 space-y-4">
        {camera === 'on' ? (
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-lg border-2 border-primary/80" />
          </div>
        ) : null}
        {camera === 'unsupported' ? (
          <Alert role="status">{copy.barcode.cameraUnsupported}</Alert>
        ) : camera === 'denied' ? (
          <Alert role="status">{copy.barcode.cameraDenied}</Alert>
        ) : null}
        <Button
          type="button"
          variant={camera === 'on' ? 'outline' : 'secondary'}
          className="w-full"
          onClick={() => (camera === 'on' ? stopCamera() : void startCamera())}
        >
          {camera === 'on' ? (
            <>
              <CameraOff className="size-4" aria-hidden />
              {copy.barcode.stopCamera}
            </>
          ) : (
            <>
              <Camera className="size-4" aria-hidden />
              {copy.barcode.startCamera}
            </>
          )}
        </Button>
      </div>

      <form
        className="space-y-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void lookup(code);
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="barcode-manual">{copy.barcode.manualLabel}</Label>
          <Input
            id="barcode-manual"
            inputMode="numeric"
            autoComplete="off"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 14))}
            className="text-numeric text-lg tracking-widest"
            aria-invalid={error === 'invalid' || undefined}
          />
        </div>
        {message ? <Alert variant="danger">{message}</Alert> : null}
        <Button type="submit" size="lg" className="w-full" disabled={looking}>
          {looking ? copy.barcode.looking : copy.barcode.lookup}
        </Button>
      </form>
    </PageContainer>
  );
}
