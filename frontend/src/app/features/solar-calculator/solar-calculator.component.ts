import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SolarCalculatorService } from '../../core/services/solar-calculator.service';
import {
  DEFAULT_SOLAR_INPUTS,
  HourlyProfileType,
  MonthData,
  SolarCalculatorInputs,
  SolarCalculatorOutputs,
  SolarLocation,
  SolarLocationKey,
} from '../../core/models/solar-calculator.model';

export interface ChartPoint {
  hour: number;
  label: string;
  x: number;
  yGen: number;
  yUse: number;
  ySelf: number;
  genKw: number;
  useKw: number;
  selfKw: number;
  surplusKw: number;
  importKw: number;
}

export interface ChartGridLine {
  y: number;
  label: string;
  value: number;
}

export interface ChartXTick {
  x: number;
  label: string;
}

export interface SvgChartData {
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
  chartWidth: number;
  chartHeight: number;
  maxKw: number;
  gridLines: ChartGridLine[];
  xTicks: ChartXTick[];
  points: ChartPoint[];
  genPolyline: string;
  usePolyline: string;
  genAreaPath: string;
  selfAreaPath: string;
}

export interface ChartTooltipData {
  hour: number;
  label: string;
  genKw: number;
  useKw: number;
  selfKw: number;
  surplusKw: number;
  importKw: number;
  x: number;
  y: number;
  xPct: number;
  yPct: number;
  ptX: number;
}

@Component({
  selector: 'app-solar-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  templateUrl: './solar-calculator.component.html',
  styleUrl: './solar-calculator.component.css',
})
export class SolarCalculatorComponent {
  readonly solarService = inject(SolarCalculatorService);

  @Input() isDrawer: boolean = false;
  @Output() closeDrawer = new EventEmitter<void>();

  // Signals reactivos principales
  inputs = signal<SolarCalculatorInputs>({ ...DEFAULT_SOLAR_INPUTS });
  customWeights = signal<number[]>([...this.solarService.getDefaultProfileWeights('home')]);
  manualHspEdited = signal<boolean>(false);
  tooltip = signal<ChartTooltipData | null>(null);
  copiedFeedback = signal<boolean>(false);

  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;

  // Catálogos estáticos / de referencia
  readonly locations: SolarLocation[] = this.solarService.getLocations();
  readonly months: MonthData[] = this.solarService.getMonths();

  // Computed: salida de balance y dimensionamiento
  readonly outputs = computed<SolarCalculatorOutputs>(() => {
    const currentInputs = this.inputs();
    const effectiveInputs: SolarCalculatorInputs = {
      ...currentInputs,
      customHourlyWeights:
        currentInputs.profileType === 'custom' ? this.customWeights() : undefined,
    };
    return this.solarService.calculate(effectiveInputs);
  });

  // Computed: valor de referencia de HSP histórica para la ubicación y mes seleccionados
  readonly hspHint = computed<number>(() => {
    const { locationKey, monthIndex } = this.inputs();
    return this.solarService.getDefaultHsp(locationKey, monthIndex);
  });

  // Computed: estructura completa para renderizado vectorial SVG de 900x330
  readonly svgChart = computed<SvgChartData>(() => {
    const outs = this.outputs();
    const padLeft = 65;
    const padRight = 30;
    const padTop = 30;
    const padBottom = 40;
    const chartWidth = 900 - padLeft - padRight; // 805
    const chartHeight = 330 - padTop - padBottom; // 260

    // Cálculo del valor máximo en kW para la escala vertical
    const genMax = Math.max(...outs.hourlyGenerationKw, 0);
    const useMax = Math.max(...outs.hourlyConsumptionKw, 0);
    const rawMax = Math.max(genMax, useMax, 0.5);
    const maxKw = this.calculateNiceMax(rawMax);

    // 4 intervalos horizontales (5 líneas de grilla)
    const gridLines: ChartGridLine[] = [];
    const divisions = 4;
    for (let i = 0; i <= divisions; i++) {
      const val = (maxKw / divisions) * i;
      const y = padTop + chartHeight - (val / maxKw) * chartHeight;
      gridLines.push({
        y,
        value: val,
        label: `${this.solarService.formatNumber(val, val >= 10 ? 0 : 1)} kW`,
      });
    }

    // 24 puntos horarios y curvas
    const points: ChartPoint[] = [];
    const genPointsArr: string[] = [];
    const usePointsArr: string[] = [];
    const selfPointsArr: string[] = [];

    for (let h = 0; h < 24; h++) {
      const x = padLeft + (h / 23) * chartWidth;
      const gen = outs.hourlyGenerationKw[h] ?? 0;
      const use = outs.hourlyConsumptionKw[h] ?? 0;
      const self = Math.min(gen, use);
      const surplus = Math.max(0, gen - use);
      const imp = Math.max(0, use - gen);

      const yGen = padTop + chartHeight - (gen / maxKw) * chartHeight;
      const yUse = padTop + chartHeight - (use / maxKw) * chartHeight;
      const ySelf = padTop + chartHeight - (self / maxKw) * chartHeight;

      points.push({
        hour: h,
        label: `${h.toString().padStart(2, '0')}:00`,
        x,
        yGen,
        yUse,
        ySelf,
        genKw: gen,
        useKw: use,
        selfKw: self,
        surplusKw: surplus,
        importKw: imp,
      });

      genPointsArr.push(`${x.toFixed(1)},${yGen.toFixed(1)}`);
      usePointsArr.push(`${x.toFixed(1)},${yUse.toFixed(1)}`);
      selfPointsArr.push(`${x.toFixed(1)},${ySelf.toFixed(1)}`);
    }

    const genPolyline = genPointsArr.join(' ');
    const usePolyline = usePointsArr.join(' ');

    const baselineY = (padTop + chartHeight).toFixed(1);
    const firstX = padLeft.toFixed(1);
    const lastX = (padLeft + chartWidth).toFixed(1);

    // Área sombreada bajo la curva de generación solar
    const genAreaPath = `M ${firstX},${baselineY} L ${genPointsArr.join(
      ' L '
    )} L ${lastX},${baselineY} Z`;

    // Área sombreada de autoconsumo simultáneo
    const selfAreaPath = `M ${firstX},${baselineY} L ${selfPointsArr.join(
      ' L '
    )} L ${lastX},${baselineY} Z`;

    // Ticks del eje X (cada 3 horas)
    const tickHours = [0, 3, 6, 9, 12, 15, 18, 21, 23];
    const xTicks: ChartXTick[] = tickHours.map((h) => ({
      x: padLeft + (h / 23) * chartWidth,
      label: `${h.toString().padStart(2, '0')}h`,
    }));

    return {
      padLeft,
      padRight,
      padTop,
      padBottom,
      chartWidth,
      chartHeight,
      maxKw,
      gridLines,
      xTicks,
      points,
      genPolyline,
      usePolyline,
      genAreaPath,
      selfAreaPath,
    };
  });

  /**
   * Determina un máximo visual limpio y redondeado para el eje Y.
   */
  private calculateNiceMax(raw: number): number {
    if (raw <= 1) return 1;
    if (raw <= 2) return 2;
    if (raw <= 3) return 3;
    if (raw <= 5) return 5;
    if (raw <= 8) return 8;
    if (raw <= 12) return 12;
    if (raw <= 16) return 16;
    if (raw <= 20) return 20;
    if (raw <= 30) return 30;
    return Math.ceil(raw / 10) * 10;
  }

  // Métodos de cambio de configuración
  onLocationChange(key: SolarLocationKey): void {
    const currentMonth = this.inputs().monthIndex;
    const defaultHsp = this.solarService.getDefaultHsp(key, currentMonth);
    this.manualHspEdited.set(false);
    this.inputs.update((prev) => ({
      ...prev,
      locationKey: key,
      hsp: defaultHsp,
    }));
  }

  onMonthChange(monthIdx: number): void {
    const parsedIdx = Number(monthIdx);
    const currentLoc = this.inputs().locationKey;
    const defaultHsp = this.solarService.getDefaultHsp(currentLoc, parsedIdx);
    this.manualHspEdited.set(false);
    this.inputs.update((prev) => ({
      ...prev,
      monthIndex: parsedIdx,
      hsp: defaultHsp,
    }));
  }

  onHspInput(hsp: number): void {
    const val = Number(hsp);
    this.manualHspEdited.set(true);
    this.inputs.update((prev) => ({
      ...prev,
      hsp: isNaN(val) ? 0 : val,
    }));
  }

  resetHspToDefault(): void {
    const { locationKey, monthIndex } = this.inputs();
    const defaultHsp = this.solarService.getDefaultHsp(locationKey, monthIndex);
    this.manualHspEdited.set(false);
    this.inputs.update((prev) => ({
      ...prev,
      hsp: defaultHsp,
    }));
  }

  updatePanelPower(powerWp: number): void {
    const val = Math.max(10, Number(powerWp) || 0);
    this.inputs.update((prev) => ({ ...prev, panelPowerWp: val }));
  }

  updatePanelCount(count: number): void {
    const val = Math.max(1, Number(count) || 1);
    this.inputs.update((prev) => ({ ...prev, panelCount: val }));
  }

  updatePerformanceRatio(pr: number): void {
    const val = Math.max(10, Math.min(100, Number(pr) || 80));
    this.inputs.update((prev) => ({ ...prev, performanceRatio: val }));
  }

  updateMonthlyConsumption(kwh: number): void {
    const val = Math.max(0, Number(kwh) || 0);
    this.inputs.update((prev) => ({ ...prev, monthlyConsumptionKwh: val }));
  }

  updateBuyPrice(price: number): void {
    const val = Math.max(0, Number(price) || 0);
    this.inputs.update((prev) => ({ ...prev, buyPricePerKwh: val }));
  }

  updateExportPrice(price: number): void {
    const val = Math.max(0, Number(price) || 0);
    this.inputs.update((prev) => ({ ...prev, exportPricePerKwh: val }));
  }

  setProfile(type: HourlyProfileType): void {
    this.inputs.update((prev) => ({ ...prev, profileType: type }));
    if (type !== 'custom') {
      this.customWeights.set([...this.solarService.getDefaultProfileWeights(type)]);
    }
  }

  onCustomWeightChange(hour: number, val: number): void {
    const num = Math.max(0, Number(val) || 0);
    this.customWeights.update((weights) => {
      const next = [...weights];
      next[hour] = num;
      return next;
    });
  }

  loadPresetIntoCustom(type: 'home' | 'business' | 'flat'): void {
    if (type === 'flat') {
      this.customWeights.set(new Array(24).fill(1));
    } else {
      this.customWeights.set([...this.solarService.getDefaultProfileWeights(type)]);
    }
  }

  // Hover interactivo en la gráfica
  onHoverHour(hour: number, event?: MouseEvent): void {
    const chart = this.svgChart();
    const pt = chart.points.find((p) => p.hour === hour);
    if (!pt) return;

    let clientX = event?.clientX ?? 0;
    let clientY = event?.clientY ?? 0;

    if (event?.currentTarget) {
      const target = event.currentTarget as SVGElement | HTMLElement;
      const svgEl = target.closest('svg');
      if (svgEl) {
        const rect = svgEl.getBoundingClientRect();
        clientX = rect.left + (pt.x / 900) * rect.width;
        const topKwY = Math.min(pt.yGen, pt.yUse);
        clientY = rect.top + (topKwY / 330) * rect.height;
      }
    }

    const topKwY = Math.min(pt.yGen, pt.yUse);
    const xPct = (pt.x / 900) * 100;
    const yPct = (topKwY / 330) * 100;

    this.tooltip.set({
      hour: pt.hour,
      label: pt.label,
      genKw: pt.genKw,
      useKw: pt.useKw,
      selfKw: pt.selfKw,
      surplusKw: pt.surplusKw,
      importKw: pt.importKw,
      x: clientX,
      y: clientY,
      xPct,
      yPct,
      ptX: pt.x,
    });
  }

  onLeaveChart(): void {
    this.tooltip.set(null);
  }

  // Acciones de usuario: Compartir / Imprimir
  async shareResult(): Promise<void> {
    const summary = this.solarService.generateShareSummary(this.inputs(), this.outputs());

    if (
      typeof navigator !== 'undefined' &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ text: summary })
    ) {
      try {
        await navigator.share({
          title: 'Balance Solar - Calculadora Fotovoltaica',
          text: summary,
        });
        return;
      } catch (err: unknown) {
        // Si el usuario canceló la ventana de compartir nativa, no forzar toast
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
      }
    }

    // Fallback estándar al portapapeles
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
        this.triggerCopiedFeedback();
      } else if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = summary;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.triggerCopiedFeedback();
      }
    } catch (err) {
      console.error('Error al copiar el resumen al portapapeles:', err);
    }
  }

  private triggerCopiedFeedback(): void {
    this.copiedFeedback.set(true);
    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
    this.copiedTimeout = setTimeout(() => {
      this.copiedFeedback.set(false);
    }, 3000);
  }

  print(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  onCloseDrawerClick(): void {
    this.closeDrawer.emit();
  }
}
