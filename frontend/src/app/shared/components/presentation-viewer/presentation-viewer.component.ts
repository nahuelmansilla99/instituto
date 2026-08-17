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
  template: `
    <div
      #viewerContainer
      class="presentation-viewer-root"
      [class.is-fullscreen]="isFullscreen()"
      tabindex="0"
      (keydown)="handleKeyDown($event)"
      (touchstart)="onTouchStart($event)"
      (touchend)="onTouchEnd($event)"
    >
      <!-- HEADER TOOLBAR -->
      <header class="viewer-top-bar">
        <div class="deck-info">
          <div class="deck-badge-icon">
            <span *ngIf="format() === 'pptx'">📊</span>
            <span *ngIf="format() === 'pdf'">📑</span>
            <span *ngIf="format() === 'prezi'">🌀</span>
            <span *ngIf="format() === 'embed'">🌐</span>
            <span *ngIf="format() === 'other'">📁</span>
          </div>
          <div class="deck-text">
            <h3 class="deck-title">{{ title || filename() }}</h3>
            <span class="deck-subtitle">
              {{ formatLabel() }} &bull; {{ filename() }}
            </span>
          </div>
        </div>

        <div class="deck-quick-actions">
          <!-- Thumbnails Toggle (for PPTX & PDF) -->
          <button
            *ngIf="isNativeDeck() && totalSlides() > 1"
            (click)="toggleThumbnails()"
            class="v-btn v-btn-ghost"
            [class.v-btn-active]="showThumbnails()"
            title="Ver lista de miniaturas de diapositivas"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span class="btn-label-desktop">Miniaturas</span>
          </button>

          <!-- Zoom In/Out (for PPTX & PDF) -->
          <div class="zoom-controls" *ngIf="isNativeDeck()">
            <button (click)="zoomOut()" class="v-btn-icon" [disabled]="zoomFactor() <= 0.6" title="Reducir zoom (-)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <span class="zoom-indicator" (click)="resetZoom()" title="Hacer clic para restaurar 100%">
              {{ Math.round(zoomFactor() * 100) }}%
            </span>
            <button (click)="zoomIn()" class="v-btn-icon" [disabled]="zoomFactor() >= 2.5" title="Aumentar zoom (+)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>

          <!-- Open in Prezi / External Platform Button -->
          <a
            *ngIf="format() === 'prezi' || format() === 'embed'"
            [href]="presentationUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="v-btn v-btn-secondary"
            [title]="format() === 'prezi' ? 'Abrir presentación en prezi.com' : 'Abrir enlace original'"
          >
            <span *ngIf="format() === 'prezi'">🌀 Abrir en Prezi</span>
            <span *ngIf="format() === 'embed'">↗️ Abrir Enlace</span>
          </a>

          <!-- Fullscreen Toggle -->
          <button (click)="toggleFullscreen()" class="v-btn v-btn-ghost" title="Pantalla Completa (Tecla F)">
            <svg *ngIf="!isFullscreen()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
            <svg *ngIf="isFullscreen()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="4 14 10 14 10 20"></polyline>
              <polyline points="20 10 14 10 14 4"></polyline>
              <line x1="14" y1="10" x2="21" y2="3"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
            <span class="btn-label-desktop">{{ isFullscreen() ? 'Salir' : 'Pantalla Completa' }}</span>
          </button>

          <!-- Download (Only for local/downloadable PPTX/PDF) -->
          <a
            *ngIf="isNativeDeck() || format() === 'other'"
            [href]="presentationUrl"
            target="_blank"
            [download]="filename()"
            class="v-btn v-btn-primary"
            title="Descargar archivo original"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span class="btn-label-desktop">Descargar</span>
          </a>
        </div>
      </header>

      <!-- MAIN STAGE (SLIDE / PREZI DISPLAY AREA) -->
      <div class="viewer-stage-container">
        <!-- LOADING SPINNER / SKELETON -->
        <div *ngIf="isLoading()" class="viewer-stage-loader">
          <div class="spinner-orbit"></div>
          <p class="loader-message">{{ loadingMessage() }}</p>
        </div>

        <!-- ERROR STATE -->
        <div *ngIf="errorMessage()" class="viewer-error-state">
          <div class="error-icon-box">⚠️</div>
          <h4>No se pudo cargar la presentación interactiva</h4>
          <p>{{ errorMessage() }}</p>
          <div class="error-actions">
            <button (click)="retryLoad()" class="v-btn v-btn-secondary">
              <span>Reintentar Carga</span>
            </button>
            <a [href]="presentationUrl" target="_blank" class="v-btn v-btn-primary">
              <span>Abrir Enlace Directamente</span>
            </a>
          </div>
        </div>

        <!-- STAGE SLIDE WRAPPER FOR PPTX / PDF -->
        <div
          *ngIf="isNativeDeck()"
          class="stage-viewport"
          [style.display]="isLoading() || errorMessage() ? 'none' : 'flex'"
          [style.transform]="'scale(' + zoomFactor() + ')'"
          [style.transformOrigin]="'center center'"
        >
          <!-- PPTX Container (rendered via @aiden0z/pptx-renderer) -->
          <div
            #pptxMountPoint
            class="pptx-mount-element"
            [style.display]="format() === 'pptx' ? 'flex' : 'none'"
          ></div>

          <!-- PDF Canvas (rendered via pdfjs-dist) -->
          <div
            class="pdf-canvas-container"
            [style.display]="format() === 'pdf' ? 'flex' : 'none'"
          >
            <canvas #pdfCanvas class="pdf-canvas-element"></canvas>
          </div>
        </div>

        <!-- PREZI INTERACTIVE IFRAME PLAYER -->
        <div
          *ngIf="format() === 'prezi'"
          class="iframe-stage-container prezi-stage-container"
          [style.display]="isLoading() || errorMessage() ? 'none' : 'flex'"
        >
          <iframe
            *ngIf="safeEmbedUrl()"
            [src]="safeEmbedUrl()"
            class="presentation-iframe-element"
            webkitallowfullscreen="true"
            mozallowfullscreen="true"
            allowfullscreen="true"
            allow="fullscreen; autoplay; encrypted-media"
            frameborder="0"
          ></iframe>
        </div>

        <!-- GENERIC / GOOGLE SLIDES / CANVA IFRAME PLAYER -->
        <div
          *ngIf="format() === 'embed'"
          class="iframe-stage-container embed-stage-container"
          [style.display]="isLoading() || errorMessage() ? 'none' : 'flex'"
        >
          <iframe
            *ngIf="safeEmbedUrl()"
            [src]="safeEmbedUrl()"
            class="presentation-iframe-element"
            webkitallowfullscreen="true"
            mozallowfullscreen="true"
            allowfullscreen="true"
            allow="fullscreen; autoplay; encrypted-media"
            frameborder="0"
          ></iframe>
        </div>

        <!-- Fallback View if format is unknown -->
        <div *ngIf="format() === 'other'" class="other-format-card">
          <div class="other-icon">📑</div>
          <h4>Presentación en formato {{ formatLabel() }}</h4>
          <p>Puedes descargar el archivo o abrirlo en tu navegador.</p>
          <a [href]="presentationUrl" target="_blank" class="v-btn v-btn-primary">
            Abrir {{ filename() }}
          </a>
        </div>

        <!-- Hover Navigation Arrow Left (Previous - for PPTX & PDF) -->
        <button
          *ngIf="isNativeDeck() && totalSlides() > 1"
          (click)="previousSlide()"
          class="stage-arrow-btn stage-arrow-left"
          [disabled]="currentSlide() <= 1"
          title="Diapositiva anterior (Tecla ←)"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <!-- Hover Navigation Arrow Right (Next - for PPTX & PDF) -->
        <button
          *ngIf="isNativeDeck() && totalSlides() > 1"
          (click)="nextSlide()"
          class="stage-arrow-btn stage-arrow-right"
          [disabled]="currentSlide() >= totalSlides()"
          title="Diapositiva siguiente (Tecla →)"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      <!-- PROGRESS BAR (FOR PPTX & PDF) -->
      <div class="viewer-progress-track" *ngIf="isNativeDeck() && totalSlides() > 1">
        <div
          class="viewer-progress-bar"
          [style.width.%]="((currentSlide() - 1) / (totalSlides() - 1 || 1)) * 100"
        ></div>
      </div>

      <!-- BOTTOM CONTROL TOOLBAR (SLIDE BY SLIDE NAVIGATION FOR PPTX / PDF) -->
      <footer class="viewer-bottom-bar" *ngIf="isNativeDeck()">
        <div class="bottom-left-group">
          <!-- Previous Slide Button -->
          <button
            (click)="previousSlide()"
            class="v-btn v-btn-nav"
            [disabled]="currentSlide() <= 1"
            title="Diapositiva anterior (Flecha Izquierda)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Anterior</span>
          </button>

          <!-- Slide Selector / Counter -->
          <div class="slide-counter-group" *ngIf="totalSlides() > 0">
            <span class="slide-counter-label">Diapositiva</span>
            <div class="slide-input-wrapper">
              <select
                class="slide-jump-select"
                [value]="currentSlide()"
                (change)="onSlideSelectChange($event)"
                title="Seleccionar diapositiva"
              >
                <option *ngFor="let s of slideIndices()" [value]="s">
                  {{ s }}
                </option>
              </select>
            </div>
            <span class="slide-counter-total">de {{ totalSlides() }}</span>
          </div>

          <!-- Next Slide Button -->
          <button
            (click)="nextSlide()"
            class="v-btn v-btn-nav v-btn-nav-primary"
            [disabled]="currentSlide() >= totalSlides()"
            title="Diapositiva siguiente (Flecha Derecha / Espacio)"
          >
            <span>Siguiente</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <div class="bottom-right-group">
          <!-- Keyboard Shortcut Hint -->
          <div class="keyboard-hints" title="Puedes usar las flechas del teclado o espacio">
            <span class="key-cap">←</span>
            <span class="key-cap">→</span>
            <span class="hint-text">Navega con las flechas</span>
          </div>
        </div>
      </footer>

      <!-- PREZI & EMBED BOTTOM BAR -->
      <footer class="viewer-bottom-bar prezi-bottom-bar" *ngIf="format() === 'prezi' || format() === 'embed'">
        <div class="prezi-hint">
          <span class="hint-icon">🌀</span>
          <span class="hint-text">
            <strong>Presentación Prezi Interactiva:</strong> Haz clic sobre la presentación y usa los controles del reproductor para avanzar y hacer zoom cinemático.
          </span>
        </div>
        <div class="prezi-actions">
          <a [href]="presentationUrl" target="_blank" rel="noopener noreferrer" class="v-btn v-btn-ghost v-btn-sm">
            <span>↗️ Abrir en Prezi</span>
          </a>
          <button (click)="toggleFullscreen()" class="v-btn v-btn-primary v-btn-sm">
            <span>⛶ Pantalla Completa</span>
          </button>
        </div>
      </footer>

      <!-- THUMBNAILS FILMSTRIP DRAWER (FOR PPTX & PDF) -->
      <div *ngIf="isNativeDeck() && showThumbnails() && totalSlides() > 1" class="viewer-filmstrip-drawer">
        <div class="filmstrip-header">
          <span>📑 Diapositivas ({{ totalSlides() }})</span>
          <button (click)="showThumbnails.set(false)" class="filmstrip-close-btn" title="Cerrar miniaturas">
            ✕
          </button>
        </div>
        <div class="filmstrip-scroll-area">
          <div
            *ngFor="let num of slideIndices()"
            class="filmstrip-thumb-card"
            [class.thumb-active]="num === currentSlide()"
            (click)="goToSlide(num)"
          >
            <div class="thumb-preview-box">
              <span class="thumb-icon">{{ format() === 'pptx' ? '📊' : '📑' }}</span>
              <span class="thumb-number-badge">#{{ num }}</span>
            </div>
            <div class="thumb-label">Diapositiva {{ num }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .presentation-viewer-root {
        position: relative;
        display: flex;
        flex-direction: column;
        background: #080c14;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6);
        outline: none;
        user-select: none;
        transition: all 0.25s ease;
      }

      .presentation-viewer-root:focus-visible {
        box-shadow: 0 0 0 2px #6366f1, 0 20px 40px -15px rgba(0, 0, 0, 0.6);
      }

      .presentation-viewer-root.is-fullscreen {
        position: fixed;
        inset: 0;
        z-index: 99999;
        border-radius: 0;
        border: none;
        width: 100vw;
        height: 100vh;
      }

      /* TOP BAR */
      .viewer-top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 20px;
        background: rgba(15, 23, 42, 0.95);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        gap: 16px;
        flex-wrap: wrap;
      }

      .deck-info {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .deck-badge-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        background: rgba(99, 102, 241, 0.15);
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 10px;
        font-size: 1.25rem;
        flex-shrink: 0;
      }

      .deck-text {
        min-width: 0;
      }

      .deck-title {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #f8fafc;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 380px;
      }

      .deck-subtitle {
        font-size: 0.78rem;
        color: #94a3b8;
      }

      .deck-quick-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
      }

      /* BUTTONS */
      .v-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 0.86rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.18s ease;
        text-decoration: none;
        border: none;
        line-height: 1;
      }

      .v-btn-ghost {
        background: rgba(255, 255, 255, 0.06);
        color: #e2e8f0;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .v-btn-ghost:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
      }

      .v-btn-active {
        background: rgba(99, 102, 241, 0.25) !important;
        border-color: #6366f1 !important;
        color: #a5b4fc !important;
      }

      .v-btn-primary {
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
      }

      .v-btn-primary:hover:not(:disabled) {
        box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5);
        transform: translateY(-1px);
      }

      .v-btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      .v-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.18);
      }

      .v-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none !important;
      }

      /* ZOOM CONTROLS */
      .zoom-controls {
        display: flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 2px 4px;
      }

      .v-btn-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: transparent;
        border: none;
        color: #cbd5e1;
        cursor: pointer;
        border-radius: 6px;
        transition: background 0.15s;
      }

      .v-btn-icon:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
      }

      .v-btn-icon:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .zoom-indicator {
        font-size: 0.8rem;
        font-weight: 600;
        color: #cbd5e1;
        padding: 0 8px;
        cursor: pointer;
      }

      /* MAIN STAGE */
      .viewer-stage-container {
        position: relative;
        flex: 1;
        min-height: 520px;
        max-height: 75vh;
        height: 600px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at center, #111827 0%, #030712 100%);
        overflow: hidden;
      }

      .is-fullscreen .viewer-stage-container {
        max-height: none;
        height: calc(100vh - 130px);
      }

      .stage-viewport {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1);
        padding: 20px;
        box-sizing: border-box;
      }

      /* PPTX MOUNT POINT */
      .pptx-mount-element {
        max-width: 100%;
        max-height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .pptx-mount-element ::ng-deep .pptx-slide {
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6) !important;
        border-radius: 8px !important;
        overflow: hidden !important;
      }

      /* PDF CANVAS */
      .pdf-canvas-container {
        display: flex;
        align-items: center;
        justify-content: center;
        max-width: 100%;
        max-height: 100%;
      }

      .pdf-canvas-element {
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
        border-radius: 8px;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        background: #fff;
      }

      /* HOVER ARROW BUTTONS ON STAGE */
      .stage-arrow-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0.3;
        transition: all 0.2s ease;
        z-index: 10;
      }

      .viewer-stage-container:hover .stage-arrow-btn {
        opacity: 0.85;
      }

      .stage-arrow-btn:hover:not(:disabled) {
        opacity: 1 !important;
        transform: translateY(-50%) scale(1.1);
        background: #6366f1;
        border-color: #818cf8;
      }

      .stage-arrow-btn:disabled {
        opacity: 0 !important;
        pointer-events: none;
      }

      .stage-arrow-left {
        left: 20px;
      }

      .stage-arrow-right {
        right: 20px;
      }

      /* STAGE LOADER */
      .viewer-stage-loader {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        color: #cbd5e1;
      }

      .spinner-orbit {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 3px solid rgba(99, 102, 241, 0.2);
        border-top-color: #6366f1;
        animation: spin 0.9s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .loader-message {
        font-size: 0.95rem;
        margin: 0;
      }

      /* ERROR STATE */
      .viewer-error-state {
        text-align: center;
        max-width: 440px;
        padding: 32px 24px;
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 12px;
      }

      .error-icon-box {
        font-size: 2.8rem;
        margin-bottom: 12px;
      }

      .viewer-error-state h4 {
        margin: 0 0 8px;
        color: #fca5a5;
        font-size: 1.15rem;
      }

      .viewer-error-state p {
        color: #94a3b8;
        font-size: 0.9rem;
        margin: 0 0 20px;
      }

      .error-actions {
        display: flex;
        justify-content: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      /* OTHER FORMAT CARD */
      .other-format-card {
        text-align: center;
        padding: 40px 24px;
      }

      .other-icon {
        font-size: 3.5rem;
        margin-bottom: 12px;
      }

      .other-format-card h4 {
        color: #fff;
        margin: 0 0 8px;
      }

      .other-format-card p {
        color: #94a3b8;
        margin: 0 0 20px;
      }

      /* PROGRESS TRACK */
      .viewer-progress-track {
        height: 4px;
        background: rgba(255, 255, 255, 0.08);
        width: 100%;
        position: relative;
      }

      .viewer-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #6366f1 0%, #a855f7 100%);
        transition: width 0.25s ease-out;
      }

      /* BOTTOM BAR */
      .viewer-bottom-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        background: rgba(15, 23, 42, 0.95);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        gap: 16px;
        flex-wrap: wrap;
      }

      .bottom-left-group {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .v-btn-nav {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 9px 18px;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #f1f5f9;
        cursor: pointer;
        transition: all 0.18s ease;
      }

      .v-btn-nav:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.16);
        border-color: rgba(255, 255, 255, 0.25);
      }

      .v-btn-nav-primary {
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        border-color: #6366f1;
        box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
      }

      .v-btn-nav-primary:hover:not(:disabled) {
        box-shadow: 0 6px 18px rgba(99, 102, 241, 0.5);
      }

      .v-btn-nav:disabled {
        opacity: 0.35;
        cursor: not-allowed;
        box-shadow: none;
      }

      .slide-counter-group {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
        color: #cbd5e1;
      }

      .slide-counter-label {
        color: #94a3b8;
        font-size: 0.85rem;
      }

      .slide-jump-select {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #ffffff;
        padding: 5px 10px;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        outline: none;
      }

      .slide-jump-select option {
        background: #0f172a;
        color: #fff;
      }

      .slide-counter-total {
        color: #94a3b8;
        font-weight: 500;
      }

      .keyboard-hints {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8rem;
        color: #64748b;
      }

      .key-cap {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 2px 7px;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 4px;
        font-weight: 600;
        color: #94a3b8;
      }

      /* IFRAME & PREZI STAGE */
      .iframe-stage-container {
        width: 100%;
        height: 100%;
        min-height: 520px;
        max-height: 75vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #0b0f19;
        border-radius: 8px;
        overflow: hidden;
      }

      .is-fullscreen .iframe-stage-container {
        max-height: none;
        height: calc(100vh - 130px);
      }

      .presentation-iframe-element {
        width: 100%;
        height: 100%;
        min-height: 520px;
        border: none;
        border-radius: 8px;
        background: #0b0f19;
      }

      .is-fullscreen .presentation-iframe-element {
        height: 100%;
      }

      .prezi-bottom-bar {
        justify-content: space-between;
        padding: 12px 24px;
        background: rgba(15, 23, 42, 0.95);
      }

      .prezi-hint {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.85rem;
        color: #cbd5e1;
      }

      .prezi-hint .hint-icon {
        font-size: 1.2rem;
      }

      .prezi-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .v-btn-sm {
        padding: 6px 14px;
        font-size: 0.82rem;
      }

      /* THUMBNAILS FILMSTRIP DRAWER */
      .viewer-filmstrip-drawer {
        position: absolute;
        bottom: 60px;
        left: 0;
        right: 0;
        background: rgba(15, 23, 42, 0.96);
        backdrop-filter: blur(16px);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding: 12px 20px;
        z-index: 30;
        box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.6);
        animation: slideUpDrawer 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes slideUpDrawer {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .filmstrip-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        font-size: 0.85rem;
        font-weight: 600;
        color: #94a3b8;
      }

      .filmstrip-close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 1rem;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
      }

      .filmstrip-close-btn:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
      }

      .filmstrip-scroll-area {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        padding-bottom: 6px;
        scrollbar-width: thin;
        scrollbar-color: rgba(99, 102, 241, 0.4) transparent;
      }

      .filmstrip-thumb-card {
        flex: 0 0 110px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        padding: 6px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.15s ease;
      }

      .filmstrip-thumb-card:hover {
        background: rgba(99, 102, 241, 0.15);
        border-color: rgba(99, 102, 241, 0.4);
        transform: translateY(-2px);
      }

      .filmstrip-thumb-card.thumb-active {
        background: rgba(99, 102, 241, 0.25);
        border-color: #6366f1;
        box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
      }

      .thumb-preview-box {
        position: relative;
        width: 100%;
        height: 60px;
        background: #1e293b;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .thumb-icon {
        font-size: 1.4rem;
      }

      @media (max-width: 768px) {
        .btn-label-desktop {
          display: none;
        }

        .viewer-stage-container,
        .iframe-stage-container,
        .presentation-iframe-element {
          min-height: 380px;
          height: 420px;
        }

        .stage-arrow-btn {
          width: 36px;
          height: 36px;
        }

        .keyboard-hints {
          display: none;
        }

        .prezi-bottom-bar {
          flex-direction: column;
          gap: 10px;
          align-items: flex-start;
        }
      }
    `,
  ],
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
