import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-pdf-viewer-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-viewer-modal.component.html',
  styleUrl: './pdf-viewer-modal.component.css',
})
export class PdfViewerModalComponent {
  @Input({ required: true }) pdfUrl: SafeResourceUrl | null = null;
  @Input() title: string = 'Visualizador de PDF';

  @Output() close = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }

  onDownload(): void {
    this.download.emit();
  }
}
