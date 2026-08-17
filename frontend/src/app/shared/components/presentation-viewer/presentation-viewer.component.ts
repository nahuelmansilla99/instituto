import {
  Component,
  Input,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ElementRef,
  ViewChild,
  HostListener,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PptxViewer } from '@aiden0z/pptx-renderer';
import * as pdfjsLib from 'pdfjs-dist';

export type PresentationFormat = 'pptx' | 'pdf' | 'prezi' | 'embed' | 'other';

@Component({
  selector: 'app-presentation-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './presentation-viewer.component.html',
  styleUrl: './presentation-viewer.component.css',
})
export class PresentationViewerComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) presentationUrl!: string;
  @Input() presentationFilename?: string;
  @Input() title?: string;

  @ViewChild('viewerContainer') viewerContainerRef?: ElementRef<HTMLDivElement>;
  @ViewChild('pptxMountPoint') pptxMountPointRef?: ElementRef<HTMLDivElement>;
  @ViewChild('pdfCanvas') pdfCanvasRef?: ElementRef<HTMLCanvasElement>;

  private readonly sanitizer = inject(DomSanitizer);

  readonly Math = Math;

  readonly isLoading = signal(true);
  readonly loadingMessage = signal('Cargando presentación...');
  readonly errorMessage = signal<string | null>(null);

  readonly currentSlide = signal(1);
  readonly totalSlides = signal(1);
  readonly zoomFactor = signal(1.0);
  readonly isFullscreen = signal(false);
  readonly showThumbnails = signal(false);

  readonly format = signal<PresentationFormat>('pptx');
  readonly safeEmbedUrl = signal<SafeResourceUrl | null>(null);

  readonly isNativeDeck = computed(() => this.format() === 'pptx' || this.format() === 'pdf');

  readonly filename = computed(() => {
    if (this.presentationFilename) return this.presentationFilename;
    if (!this.presentationUrl) return 'Presentación';
    if (this.presentationUrl.includes('prezi.com')) return 'Presentación Prezi';
    if (this.presentationUrl.includes('docs.google.com')) return 'Google Slides';
    if (this.presentationUrl.includes('canva.com')) return 'Presentación Canva';
    const parts = this.presentationUrl.split('/');
    return decodeURIComponent(parts[parts.length - 1]);
  });

  readonly formatLabel = computed(() => {
    switch (this.format()) {
      case 'pptx':
        return 'PowerPoint (.pptx)';
      case 'pdf':
        return 'Documento PDF (.pdf)';
      case 'prezi':
        return 'Presentación Prezi Interactiva';
      case 'embed':
        return 'Presentación Online Embed';
      default:
        return 'Presentación';
    }
  });

  readonly slideIndices = computed(() => {
    const total = this.totalSlides();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  // Internal viewer handles
  private pptxViewerInstance: PptxViewer | null = null;
  private pdfDocInstance: any = null;
  private touchStartX = 0;
  private touchStartY = 0;

  ngOnInit(): void {
    this.detectFormatAndLoad();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['presentationUrl'] && !changes['presentationUrl'].isFirstChange()) {
      this.detectFormatAndLoad();
    }
  }

  ngOnDestroy(): void {
    this.destroyCurrentViewer();
  }

  private detectFormatAndLoad(): void {
    if (!this.presentationUrl) {
      this.errorMessage.set('No se proporcionó una URL de presentación válida.');
      this.isLoading.set(false);
      return;
    }

    const rawUrl = this.presentationUrl.trim();
    const cleanUrl = rawUrl.split('?')[0].toLowerCase();

    // 1. Detect Prezi Presentation Link or Embed
    if (rawUrl.toLowerCase().includes('prezi.com')) {
      this.format.set('prezi');
      const embedUrl = this.extractPreziEmbedUrl(rawUrl);
      this.safeEmbedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl));
      this.isLoading.set(false);
      this.errorMessage.set(null);
      this.totalSlides.set(1);
      return;
    }

    // 2. Detect Google Slides Presentation
    if (rawUrl.toLowerCase().includes('docs.google.com/presentation')) {
      this.format.set('embed');
      const embedUrl = this.extractGoogleSlidesEmbedUrl(rawUrl);
      this.safeEmbedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl));
      this.isLoading.set(false);
      this.errorMessage.set(null);
      this.totalSlides.set(1);
      return;
    }

    // 3. Detect Canva or Slideshare
    if (rawUrl.toLowerCase().includes('canva.com') || rawUrl.toLowerCase().includes('slideshare.net')) {
      this.format.set('embed');
      let embedUrl = rawUrl;
      if (rawUrl.toLowerCase().includes('canva.com') && !rawUrl.includes('embed')) {
        embedUrl = rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'embed';
      }
      this.safeEmbedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl));
      this.isLoading.set(false);
      this.errorMessage.set(null);
      this.totalSlides.set(1);
      return;
    }

    // 4. Detect PDF Document
    if (cleanUrl.endsWith('.pdf')) {
      this.format.set('pdf');
      this.loadPresentation();
      return;
    }

    // 5. Default: Native PPTX / PPT / ODP parser
    if (cleanUrl.endsWith('.pptx') || cleanUrl.endsWith('.ppt') || cleanUrl.endsWith('.odp')) {
      this.format.set('pptx');
      this.loadPresentation();
      return;
    }

    // Fallback attempt PPTX
    this.format.set('pptx');
    this.loadPresentation();
  }

  private extractPreziEmbedUrl(rawUrl: string): string {
    let url = rawUrl.trim();

    // If user pasted an iframe code (e.g. <iframe src="https://prezi.com/p/embed/...">)
    if (url.includes('<iframe') && url.includes('src=')) {
      const match = url.match(/src=["']([^"']+)["']/i);
      if (match && match[1]) {
        url = match[1];
      }
    }

    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      
      // If already prezi.com/p/embed/... or /v/embed/... or /embed/...
      if (parsed.pathname.includes('/embed/')) {
        return parsed.toString();
      }

      // If prezi.com/p/{id}/... or prezi.com/view/{id}/...
      const pMatch = parsed.pathname.match(/\/(?:p|view)\/([a-zA-Z0-9_-]+)/i);
      if (pMatch && pMatch[1]) {
        return `https://prezi.com/p/embed/${pMatch[1]}/`;
      }

      // If prezi.com/v/{id}/...
      const vMatch = parsed.pathname.match(/\/v\/([a-zA-Z0-9_-]+)/i);
      if (vMatch && vMatch[1]) {
        return `https://prezi.com/v/embed/${vMatch[1]}/`;
      }

      // If prezi.com/{id}/... with an alphanumeric id
      const directMatch = parsed.pathname.match(/^\/([a-zA-Z0-9_-]{8,})\/?$/);
      if (directMatch && directMatch[1] && !['login', 'signup', 'dashboard', 'pricing'].includes(directMatch[1])) {
        return `https://prezi.com/p/embed/${directMatch[1]}/`;
      }
    } catch (_) {}

    // Fallback: return as-is
    return url.startsWith('http') ? url : `https://${url}`;
  }

  private extractGoogleSlidesEmbedUrl(rawUrl: string): string {
    let url = rawUrl.trim();
    if (url.includes('/edit')) {
      return url.replace(/\/edit.*$/, '/embed?start=false&loop=false&delayms=3000');
    }
    if (url.includes('/pub')) {
      return url.replace(/\/pub.*$/, '/embed?start=false&loop=false&delayms=3000');
    }
    if (!url.includes('/embed')) {
      return url + (url.includes('?') ? '&' : '?') + 'embed=true';
    }
    return url;
  }

  private destroyCurrentViewer(): void {
    if (this.pptxViewerInstance) {
      try {
        if (this.pptxMountPointRef?.nativeElement) {
          this.pptxMountPointRef.nativeElement.innerHTML = '';
        }
      } catch (_) {}
      this.pptxViewerInstance = null;
    }
    if (this.pdfDocInstance) {
      try {
        this.pdfDocInstance.destroy();
      } catch (_) {}
      this.pdfDocInstance = null;
    }
  }

  retryLoad(): void {
    this.detectFormatAndLoad();
  }

  private async loadPresentation(): Promise<void> {
    this.isLoading.set(true);
    this.loadingMessage.set('Descargando archivo de presentación...');
    this.errorMessage.set(null);
    this.destroyCurrentViewer();

    try {
      let normalizedUrl = this.presentationUrl.trim();
      if (!normalizedUrl.startsWith('http') && !normalizedUrl.startsWith('/')) {
        normalizedUrl = '/' + normalizedUrl;
      }
      const fetchUrl = normalizedUrl.startsWith('http')
        ? normalizedUrl
        : `${window.location.origin}${normalizedUrl}`;

      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error(`Error al obtener archivo HTTP ${res.status}: ${res.statusText}`);
      }

      const arrayBuffer = await res.arrayBuffer();

      if (this.format() === 'pptx') {
        await this.loadPptx(arrayBuffer);
      } else if (this.format() === 'pdf') {
        await this.loadPdf(arrayBuffer);
      }
    } catch (err: any) {
      console.error('Error loading presentation:', err);

      if (this.format() === 'pptx') {
        try {
          this.loadingMessage.set('Intentando visor alternativo...');
          let normalizedUrl = this.presentationUrl.trim();
          if (!normalizedUrl.startsWith('http') && !normalizedUrl.startsWith('/')) {
            normalizedUrl = '/' + normalizedUrl;
          }
          const fetchUrl = normalizedUrl.startsWith('http')
            ? normalizedUrl
            : `${window.location.origin}${normalizedUrl}`;
          const res = await fetch(fetchUrl);
          const arrayBuffer = await res.arrayBuffer();
          await this.loadPdf(arrayBuffer);
          this.format.set('pdf');
          return;
        } catch (_) {}
      }

      this.errorMessage.set(
        err?.message || 'No fue posible abrir el archivo de presentación en el visor interactivo.'
      );
      this.isLoading.set(false);
    }
  }

  private async loadPptx(arrayBuffer: ArrayBuffer): Promise<void> {
    this.loadingMessage.set('Procesando diapositivas PowerPoint...');
    const mountEl = this.pptxMountPointRef?.nativeElement;
    if (!mountEl) {
      throw new Error('Elemento montura PPTX no disponible');
    }
    mountEl.innerHTML = '';

    const viewer = await PptxViewer.open(arrayBuffer, mountEl, {
      renderMode: 'slide',
      fitMode: 'contain',
      onSlideChange: (index: number) => {
        this.currentSlide.set(index + 1);
      },
      onSlideRendered: () => {
        this.isLoading.set(false);
      },
      onSlideError: (_idx: number, error: unknown) => {
        console.warn('PPTX slide error:', error);
      },
    });

    this.pptxViewerInstance = viewer;
    const count = viewer.slideCount || 1;
    this.totalSlides.set(count);
    this.currentSlide.set((viewer.currentSlideIndex || 0) + 1);
    this.isLoading.set(false);
  }

  private async loadPdf(arrayBuffer: ArrayBuffer): Promise<void> {
    this.loadingMessage.set('Renderizando documento de diapositivas...');

    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
    });

    const pdf = await loadingTask.promise;
    this.pdfDocInstance = pdf;
    this.totalSlides.set(pdf.numPages || 1);
    this.currentSlide.set(1);
    await this.renderPdfCurrentPage();
    this.isLoading.set(false);
  }

  private async renderPdfCurrentPage(): Promise<void> {
    if (!this.pdfDocInstance || !this.pdfCanvasRef?.nativeElement) return;
    const canvas = this.pdfCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const page = await this.pdfDocInstance.getPage(this.currentSlide());
      const dpr = window.devicePixelRatio || 1;
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const targetHeight = 540;
      const baseScale = targetHeight / unscaledViewport.height;

      const viewport = page.getViewport({ scale: baseScale * dpr });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;
    } catch (e) {
      console.warn('Error rendering PDF page:', e);
    }
  }

  // NAVIGATION CONTROLS
  async goToSlide(slideNumber: number): Promise<void> {
    if (slideNumber < 1 || slideNumber > this.totalSlides()) return;
    if (slideNumber === this.currentSlide()) return;

    this.currentSlide.set(slideNumber);

    if (this.format() === 'pptx' && this.pptxViewerInstance) {
      try {
        await this.pptxViewerInstance.goToSlide(slideNumber - 1);
      } catch (e) {
        console.warn('PPTX goToSlide error:', e);
      }
    } else if (this.format() === 'pdf' && this.pdfDocInstance) {
      await this.renderPdfCurrentPage();
    }
  }

  previousSlide(): void {
    if (this.currentSlide() > 1) {
      this.goToSlide(this.currentSlide() - 1);
    }
  }

  nextSlide(): void {
    if (this.currentSlide() < this.totalSlides()) {
      this.goToSlide(this.currentSlide() + 1);
    }
  }

  onSlideSelectChange(event: Event): void {
    const val = parseInt((event.target as HTMLSelectElement).value, 10);
    if (!isNaN(val)) {
      this.goToSlide(val);
    }
  }

  // ZOOM CONTROLS
  zoomIn(): void {
    this.zoomFactor.update((z) => Math.min(2.5, +(z + 0.15).toFixed(2)));
  }

  zoomOut(): void {
    this.zoomFactor.update((z) => Math.max(0.6, +(z - 0.15).toFixed(2)));
  }

  resetZoom(): void {
    this.zoomFactor.set(1.0);
  }

  // FULLSCREEN
  toggleFullscreen(): void {
    const el = this.viewerContainerRef?.nativeElement;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen()
        .then(() => this.isFullscreen.set(true))
        .catch(() => this.isFullscreen.set(!this.isFullscreen()));
    } else {
      document.exitFullscreen()
        .then(() => this.isFullscreen.set(false))
        .catch(() => this.isFullscreen.set(false));
    }
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen.set(!!document.fullscreenElement);
  }

  toggleThumbnails(): void {
    this.showThumbnails.update((v) => !v);
  }

  // KEYBOARD SHORTCUTS
  handleKeyDown(event: KeyboardEvent): void {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) {
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
      event.preventDefault();
      this.nextSlide();
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      this.previousSlide();
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.goToSlide(1);
    } else if (event.key === 'End') {
      event.preventDefault();
      this.goToSlide(this.totalSlides());
    } else if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      this.toggleFullscreen();
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.zoomIn();
    } else if (event.key === '-') {
      event.preventDefault();
      this.zoomOut();
    } else if (event.key === '0') {
      event.preventDefault();
      this.resetZoom();
    }
  }

  // TOUCH GESTURES (SWIPE)
  onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }
  }

  onTouchEnd(e: TouchEvent): void {
    if (e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - this.touchStartX;
      const deltaY = e.changedTouches[0].clientY - this.touchStartY;

      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) {
          this.nextSlide();
        } else {
          this.previousSlide();
        }
      }
    }
  }
}
