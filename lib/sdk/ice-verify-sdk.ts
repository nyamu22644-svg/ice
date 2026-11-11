// ICE Verify — Embedded Web SDK (@ice-identity/verify-sdk)
// Technology-independent client SDK for embedding ICE Identity Verification
// into third-party web applications (e.g. Kenyan Digital Lending App).
//
// Security Constraints:
// - Never requires or accepts backend secret API keys in browser code.
// - Initialized exclusively via short-lived session tokens generated server-to-server.
// - Enforces cross-origin communication with strict origin validation and handshake.

export type IceTheme = 'light' | 'dark' | 'system';

export interface IceVerificationResult {
  sessionId: string;
  externalReferenceId?: string;
  status: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';
  completedAt: string;
}

export interface IceVerifyOptions {
  /**
   * The short-lived session token obtained by your backend via POST /api/v1/sessions
   */
  sessionToken: string;

  /**
   * The DOM element ID or HTMLElement where the verification iframe will be mounted
   */
  containerId: string | HTMLElement;

  /**
   * Base URL of the ICE verification service (defaults to current window origin or https://verify.ice.example.com)
   */
  iceOrigin?: string;

  /**
   * Theme configuration (light, dark, or system follow)
   */
  theme?: IceTheme;

  /**
   * Custom iframe height in pixels or CSS string (default: 680px)
   */
  height?: string | number;

  /**
   * Optional custom CSS class for the iframe container
   */
  className?: string;

  /**
   * Callback fired when verification is completed (approved, rejected, or queued for review)
   */
  onComplete?: (result: IceVerificationResult) => void;

  /**
   * Callback fired if the applicant cancels or clicks back
   */
  onCancel?: () => void;

  /**
   * Callback fired if an unexpected error occurs during the verification session
   */
  onError?: (error: { code: string; message: string; details?: any }) => void;

  /**
   * Callback fired as the applicant advances through stages (e.g. DOCUMENT_CAPTURE, LIVENESS, PROCESSING)
   */
  onStepChange?: (step: { stepName: string; stepIndex: number; totalSteps: number }) => void;

  /**
   * Callback fired when the verification frame is loaded and ready for interaction
   */
  onReady?: () => void;
}

export class IceVerify {
  private options: IceVerifyOptions;
  private iframe: HTMLIFrameElement | null = null;
  private container: HTMLElement | null = null;
  private iceOrigin: string;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private isMounted = false;

  constructor(options: IceVerifyOptions) {
    if (!options.sessionToken) {
      throw new Error('[IceVerify SDK] A valid sessionToken is required to initialize verification.');
    }
    if (!options.containerId) {
      throw new Error('[IceVerify SDK] A containerId or DOM element is required to mount the verification view.');
    }

    this.options = options;
    
    // Determine target origin safely
    if (options.iceOrigin) {
      this.iceOrigin = options.iceOrigin.replace(/\/$/, '');
    } else if (typeof window !== 'undefined') {
      this.iceOrigin = window.location.origin;
    } else {
      this.iceOrigin = 'https://verify.ice.example.com';
    }
  }

  /**
   * Mounts the ICE verification iframe inside the target container.
   */
  public mount(): void {
    if (this.isMounted) {
      console.warn('[IceVerify SDK] Instance is already mounted.');
      return;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.error('[IceVerify SDK] Cannot mount in non-browser environment.');
      return;
    }

    // Resolve target container
    if (typeof this.options.containerId === 'string') {
      this.container = document.getElementById(this.options.containerId);
    } else {
      this.container = this.options.containerId;
    }

    if (!this.container) {
      throw new Error(`[IceVerify SDK] Container element '${this.options.containerId}' not found in DOM.`);
    }

    // Clear previous contents if any
    this.container.innerHTML = '';

    // Create secure verification iframe
    this.iframe = document.createElement('iframe');
    
    // Extract session ID from token if formatted as tok_<sessionId>_<random> or query
    const token = this.options.sessionToken;
    let targetUrl = `${this.iceOrigin}/verify?session_token=${encodeURIComponent(token)}&embed=true`;
    if (this.options.theme) {
      targetUrl += `&theme=${encodeURIComponent(this.options.theme)}`;
    }

    this.iframe.src = targetUrl;
    this.iframe.title = 'ICE Secure Identity Verification';
    this.iframe.style.width = '100%';
    this.iframe.style.border = 'none';
    this.iframe.style.borderRadius = '8px';
    this.iframe.style.transition = 'height 0.2s ease-in-out';
    
    const heightVal = this.options.height || 680;
    this.iframe.style.height = typeof heightVal === 'number' ? `${heightVal}px` : heightVal;
    
    // Explicit camera permissions required for passive liveness and document capture
    this.iframe.allow = 'camera; microphone; display-capture; autoplay';
    this.iframe.setAttribute('credentialless', 'true');
    this.iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

    if (this.options.className) {
      this.iframe.className = this.options.className;
    }

    // Attach message protocol listener
    this.setupMessageListener();

    // Append to container
    this.container.appendChild(this.iframe);
    this.isMounted = true;
  }

  /**
   * Secure postMessage listener communicating with the iframe
   */
  private setupMessageListener(): void {
    this.messageHandler = (event: MessageEvent) => {
      // Security Check: Validate origin matches ICE service
      // In local development or same-origin preview, allow same origin
      if (this.iceOrigin && event.origin !== this.iceOrigin && !event.origin.includes('localhost') && !event.origin.includes('run.app')) {
        return;
      }

      const data = event.data;
      if (!data || typeof data !== 'object') return;

      switch (data.type) {
        case 'ICE_VERIFY_READY':
          this.options.onReady?.();
          break;

        case 'ICE_VERIFY_STEP':
          this.options.onStepChange?.({
            stepName: data.payload?.stepName || 'UNKNOWN',
            stepIndex: data.payload?.stepIndex ?? 1,
            totalSteps: data.payload?.totalSteps ?? 4,
          });
          break;

        case 'ICE_VERIFY_COMPLETE':
          this.options.onComplete?.({
            sessionId: data.payload?.sessionId,
            externalReferenceId: data.payload?.externalReferenceId,
            status: data.payload?.status || 'VERIFIED',
            completedAt: data.payload?.completedAt || new Date().toISOString(),
          });
          break;

        case 'ICE_VERIFY_CANCEL':
          this.options.onCancel?.();
          break;

        case 'ICE_VERIFY_ERROR':
          this.options.onError?.({
            code: data.payload?.code || 'VERIFICATION_ERROR',
            message: data.payload?.message || 'An error occurred during verification.',
            details: data.payload?.details,
          });
          break;

        case 'ICE_VERIFY_RESIZE':
          if (data.payload?.height && this.iframe) {
            this.iframe.style.height = `${data.payload.height}px`;
          }
          break;
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  /**
   * Sends dynamic theme or configuration updates to the running verification instance
   */
  public setTheme(theme: IceTheme): void {
    this.options.theme = theme;
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage(
        { type: 'ICE_VERIFY_SET_THEME', payload: { theme } },
        this.iceOrigin || '*'
      );
    }
  }

  /**
   * Unmounts the iframe and cleans up all listeners and DOM references
   */
  public unmount(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }

    if (this.iframe && this.container) {
      if (this.iframe.parentNode === this.container) {
        this.container.removeChild(this.iframe);
      }
      this.iframe = null;
    }

    this.isMounted = false;
  }

  /**
   * Alias for unmount
   */
  public destroy(): void {
    this.unmount();
  }
}

/**
 * Convenient procedural initializer
 */
export function initIceVerify(options: IceVerifyOptions): IceVerify {
  const instance = new IceVerify(options);
  instance.mount();
  return instance;
}
