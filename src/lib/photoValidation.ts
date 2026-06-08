import exifr from 'exifr';

export const MIN_FILE_SIZE = 30 * 1024; // 30 KB
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MIN_DIMENSION = 800;
const MIN_AVG_LUMINANCE = 15; // 0..255 — anything below is mostly black
const MIN_LUMINANCE_VARIANCE = 100; // anything below is near-uniform color (any shade)
const LUMINANCE_SAMPLE_SIZE = 100;

export type PhotoValidationError =
    | 'invalidFile'
    | 'fileTooLarge'
    | 'fileTooSmall'
    | 'noScreenshots'
    | 'photoTooSmall'
    | 'photoTooDark'
    | 'photoTooFlat'
    | 'noFaceFound'
    | 'faceDetectionUnavailable'
    | 'fetchFailed';

export type PhotoValidationParams = Record<string, string | number>;

export type PhotoValidationResult =
    | { ok: true }
    | { ok: false; errorKey: PhotoValidationError; errorParams?: PhotoValidationParams };

export type PhotoValidationOptions = {
    /**
     * Strict mode requires the face check to actually run AND find a face.
     *   - upload (default, strict=false): face check is skipped silently on
     *     browsers without FaceDetector (Safari, Firefox, iOS WKWebView) so
     *     those users can still upload at all.
     *   - reactivation (strict=true): the face check is mandatory. If the
     *     browser doesn't support it, return faceDetectionUnavailable so the
     *     user gets pointed at a supported browser instead of slipping past.
     */
    strict?: boolean;
};

export async function validatePhoto(
    file: File,
    options: PhotoValidationOptions = {},
): Promise<PhotoValidationResult> {
    const basics = validateBasics(file);
    if (!basics.ok) return basics;

    const exif = await validateExif(file);
    if (!exif.ok) return exif;

    const visual = await validateVisual(file);
    if (!visual.ok) return visual;

    const face = await validateFace(file, options.strict ?? false);
    if (!face.ok) return face;

    return { ok: true };
}

/**
 * Re-runs validatePhoto against a list of public URLs (the shape stored in
 * profiles.additional_photos). Fetches each URL into a File, then validates.
 * Used by the reactivation gate so a previously-flagged user must have a
 * minimum number of currently-valid photos before they can self-unpause.
 *
 * Returns:
 *   - okCount: how many photos passed
 *   - failures: per-failed-photo error details (URL + result)
 */
export async function revalidatePhotoUrls(
    urls: string[],
    options: PhotoValidationOptions = {},
): Promise<{ okCount: number; failures: { url: string; result: PhotoValidationResult }[] }> {
    let okCount = 0;
    const failures: { url: string; result: PhotoValidationResult }[] = [];

    for (const url of urls) {
        const result = await fetchAndValidate(url, options);
        if (result.ok) okCount++;
        else failures.push({ url, result });
    }

    return { okCount, failures };
}

async function fetchAndValidate(
    url: string,
    options: PhotoValidationOptions,
): Promise<PhotoValidationResult> {
    let blob: Blob;
    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return { ok: false, errorKey: 'fetchFailed' };
        blob = await res.blob();
    } catch {
        return { ok: false, errorKey: 'fetchFailed' };
    }
    const filename = url.split('/').pop() || 'photo';
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
    return validatePhoto(file, options);
}

function validateBasics(file: File): PhotoValidationResult {
    if (!file.type.startsWith('image/')) return { ok: false, errorKey: 'invalidFile' };
    if (file.size > MAX_FILE_SIZE) return { ok: false, errorKey: 'fileTooLarge' };
    if (file.size < MIN_FILE_SIZE) {
        return { ok: false, errorKey: 'fileTooSmall', errorParams: { minKb: Math.round(MIN_FILE_SIZE / 1024) } };
    }
    return { ok: true };
}

async function validateExif(file: File): Promise<PhotoValidationResult> {
    try {
        const exif = await exifr.parse(file, { pick: ['ImageDescription', 'UserComment', 'Software'] });
        const desc = String(exif?.ImageDescription ?? '').toLowerCase();
        const comment = String(exif?.UserComment ?? '').toLowerCase();
        const software = String(exif?.Software ?? '').toLowerCase();
        // iOS tags screenshots with ImageDescription="Screenshot".
        // Some Android variants tag via Software or UserComment.
        if (desc === 'screenshot' || comment.includes('screenshot') || software.includes('screenshot')) {
            return { ok: false, errorKey: 'noScreenshots' };
        }
    } catch {
        // EXIF parsing can fail on stripped/unusual files — fail open.
    }
    return { ok: true };
}

async function validateVisual(file: File): Promise<PhotoValidationResult> {
    const url = URL.createObjectURL(file);
    try {
        const img = await loadImage(url);
        if (img.naturalWidth < MIN_DIMENSION || img.naturalHeight < MIN_DIMENSION) {
            return {
                ok: false,
                errorKey: 'photoTooSmall',
                errorParams: { width: img.naturalWidth, height: img.naturalHeight, min: MIN_DIMENSION },
            };
        }
        const luminance = sampleLuminance(img);
        if (luminance == null) return { ok: true }; // canvas unavailable — fail open
        if (luminance.mean < MIN_AVG_LUMINANCE) return { ok: false, errorKey: 'photoTooDark' };
        if (luminance.variance < MIN_LUMINANCE_VARIANCE) return { ok: false, errorKey: 'photoTooFlat' };
    } catch {
        // Image failed to decode — let the actual upload step surface the error instead of blocking here.
    } finally {
        URL.revokeObjectURL(url);
    }
    return { ok: true };
}

async function validateFace(file: File, strict: boolean): Promise<PhotoValidationResult> {
    // Two-tier face detection. Native FaceDetector is free and fast on
    // Chromium browsers; we try it first. On Safari / Firefox / iOS WKWebView
    // (where most Orbiit users live) it doesn't exist, so we lazy-load
    // @vladmandic/face-api with the Tiny detector (≈190KB model + library)
    // — paid in bundle weight only when the user actually uploads.
    const url = URL.createObjectURL(file);
    try {
        const img = await loadImage(url);

        const native = await tryNativeFaceDetector(img);
        if (native !== 'unsupported') {
            return native ? { ok: true } : { ok: false, errorKey: 'noFaceFound' };
        }

        // Fallback: face-api.js Tiny detector. Works in any browser.
        try {
            const found = await detectFaceWithFaceApi(img);
            return found ? { ok: true } : { ok: false, errorKey: 'noFaceFound' };
        } catch (err) {
            console.warn('face-api detection failed:', err);
            // Library load / model load failed (offline, blocked CDN, etc.).
            // Strict mode must not let an undetectable photo through; lenient
            // mode lets it through rather than locking the user out of uploads.
            return strict
                ? { ok: false, errorKey: 'faceDetectionUnavailable' }
                : { ok: true };
        }
    } finally {
        URL.revokeObjectURL(url);
    }
}

async function tryNativeFaceDetector(img: HTMLImageElement): Promise<boolean | 'unsupported'> {
    const FD = (globalThis as any).FaceDetector;
    if (typeof FD !== 'function') return 'unsupported';
    try {
        const faces = await new FD().detect(img);
        return Array.isArray(faces) && faces.length > 0;
    } catch {
        return 'unsupported';
    }
}

// Lazy state — load library + weights at most once per page session.
let faceApiPromise: Promise<typeof import('@vladmandic/face-api')> | null = null;

async function loadFaceApi() {
    if (!faceApiPromise) {
        faceApiPromise = (async () => {
            const faceapi = await import('@vladmandic/face-api');
            // Explicitly initialize a tfjs backend before tensor work, with a
            // try-each-then-fall-through cascade. WebGL is what every real
            // browser uses (universally available); CPU is bundled and always
            // works (slower). WASM is intentionally skipped — we don't ship the
            // tfjs-backend-wasm .wasm binaries, so it can never initialize and
            // would otherwise be auto-selected as the highest-priority backend.
            let backendReady = false;
            for (const backend of ['webgl', 'cpu'] as const) {
                try {
                    await faceapi.tf.setBackend(backend);
                    await faceapi.tf.ready();
                    backendReady = true;
                    break;
                } catch (err) {
                    console.warn(`face-api tfjs backend "${backend}" failed:`, err);
                }
            }
            if (!backendReady) throw new Error('No tfjs backend available');
            // Models are copied from node_modules into /public/face-models at build setup.
            await faceapi.nets.tinyFaceDetector.loadFromUri('/face-models');
            return faceapi;
        })();
    }
    return faceApiPromise;
}

async function detectFaceWithFaceApi(img: HTMLImageElement): Promise<boolean> {
    const faceapi = await loadFaceApi();
    // inputSize 320 + scoreThreshold 0.4 is a good lightweight detector setup
    // for our "any face present?" gate.
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
    const detections = await faceapi.detectAllFaces(img, options);
    return detections.length > 0;
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('decode failed'));
        img.src = url;
    });
}

function sampleLuminance(img: HTMLImageElement): { mean: number; variance: number } | null {
    const canvas = document.createElement('canvas');
    canvas.width = LUMINANCE_SAMPLE_SIZE;
    canvas.height = LUMINANCE_SAMPLE_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, LUMINANCE_SAMPLE_SIZE, LUMINANCE_SAMPLE_SIZE);
    let data: Uint8ClampedArray;
    try {
        data = ctx.getImageData(0, 0, LUMINANCE_SAMPLE_SIZE, LUMINANCE_SAMPLE_SIZE).data;
    } catch {
        return null; // tainted canvas (cross-origin) — bail
    }
    let sum = 0;
    let sumSq = 0;
    const n = LUMINANCE_SAMPLE_SIZE * LUMINANCE_SAMPLE_SIZE;
    for (let i = 0; i < data.length; i += 4) {
        // Rec. 709 luminance
        const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        sum += lum;
        sumSq += lum * lum;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    return { mean, variance };
}
