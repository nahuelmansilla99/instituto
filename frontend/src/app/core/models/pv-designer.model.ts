export type PvSystemType = 'grid' | 'hybrid' | 'offgrid';
export type PvSizingMode = 'energy' | 'power';
export type PvLoadProfile = 'home' | 'business' | 'flat';
export type PvRoofType = 'coplanar' | 'ground';
export type PvView = 'project' | 'surface' | 'equipment' | 'energy' | 'electrical' | 'report';
export type PvCheckStatus = 'pass' | 'fail' | 'warn' | 'pending' | 'info' | 'declared';
export type PvExampleType = 'home' | 'mobile' | 'park';

export interface PvObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PvPhotoRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PvZone {
  id: number;
  name: string;
  width: number;
  height: number;
  tilt: number;
  azimuth: number;
  edge: number;
  gap: number;
  rowGap: number;
  portrait: boolean;
  shade: number;
  poaFactor: number;
  roofType: PvRoofType;
  alpha: number;
  obstacles: PvObstacle[];
  photoRect: PvPhotoRect | null;
}

export interface PvBattery {
  voltage: number;
  ah: number;
  dod: number;
  eff: number;
  pcs: number;
  charge: number;
  discharge: number;
}

export interface PvModule {
  name: string;
  source: string;
  verified: boolean;
  p: number;
  voc: number;
  vmp: number;
  isc: number;
  imp: number;
  bvoc: number;
  bvmp: number;
  bp: number;
  aisc: number;
  tolerance: number;
  maxv: number;
  fuse: number;
  width: number;
  height: number;
  nmot: number;
  weight: number;
  connectorA: number;
  connectorV: number;
}

export interface PvInverter {
  name: string;
  source: string;
  verified: boolean;
  ac: number;
  maxdc: number;
  maxv: number;
  min: number;
  max: number;
  start: number;
  mppts: number;
  inputs: number;
  inputA: number;
  inputIsc: number;
  mpptA: number;
  mpptIsc: number;
  mpptKW: number;
  eff: number;
  chargeKW: number;
  batteryMin: number;
  batteryMax: number;
}

export interface PvCable {
  lengthDC: number;
  sectionDC: number;
  temp: number;
  rho: number;
  ampacityDC: number;
  derating: number;
  dropDC: number;
  lengthAC: number;
  sectionAC: number;
  ampacityAC: number;
  dropAC: number;
  breaker: number;
  ratingV: number;
  spdV: number;
  iscFactor: number;
}

export interface PvAssignment {
  zone: number;
  series: number;
  parallel: number;
  quantity: number;
}

export interface PvProjectChecks {
  survey: boolean;
  structure: boolean;
  earthing: boolean;
  protection: boolean;
  utility: boolean;
  commission: boolean;
  mt: boolean;
}

export interface PvHourlyData {
  source: string;
  time: string[];
  temp: number[];
  load: number[];
  poa: Record<number, number[]>;
}

export interface PvPhotoCalibration {
  scale: number;
  reference: number;
  orthographic: boolean;
}

export interface PvProjectState {
  version: number;
  name: string;
  site: string;
  lat: number;
  lon: number;
  system: PvSystemType;
  mode: PvSizingMode;
  demand: number;
  coverage: number;
  target: number;
  peak: number;
  voltage: number;
  phases: 1 | 3;
  pf: number;
  tmin: number;
  tmax: number;
  irrmax: number;
  margin: number;
  resourceSource: string;
  resourceVerified: boolean;
  resourceLat: number | null;
  resourceLon: number | null;
  hsp: number[];
  ambient: number[];
  losses: number;
  albedo: number;
  diffuse: number;
  loadProfile: PvLoadProfile;
  month: number;
  critical: number;
  autonomy: number;
  battery: PvBattery;
  module: PvModule;
  inverter: PvInverter;
  zones: PvZone[];
  cable: PvCable;
  manual: boolean;
  assignments: PvAssignment[];
  checks: PvProjectChecks;
  notes: string;
  photo: string | null;
  hourly: PvHourlyData | null;
}

export interface PvPanelPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PvZoneLayout {
  count: number;
  positions: PvPanelPosition[];
  rows: number;
  cols: number;
  rowGap: number;
  depth: number;
  area: number;
}

export interface PvLimits {
  vocCold: number;
  vmpHot: number;
  vmpCold: number;
  vocHot: number;
  minN: number;
  maxN: number;
  isc: number;
  imp: number;
  maxV: number;
}

export interface PvMpptAssignment extends PvAssignment {
  mppt: number;
  inverter: number;
}

export interface PvInverterBlock {
  used: number;
  kw: number;
  mppts: PvMpptAssignment[];
  number: number;
}

export interface PvMonthlyPoint {
  month: number;
  energy: number;
  load: number;
  hsp: number;
  import?: number;
  export?: number;
  unserved?: number;
  clipped?: number;
}

export interface PvHourlySimResult {
  monthly: Required<PvMonthlyPoint>[];
  annual: number;
  load: number;
  gridImport: number;
  gridExport: number;
  unserved: number;
  clipped: number;
  charged: number;
  discharged: number;
  generation: number[];
  socSeries: number[];
  loadSeries: number[];
  imports: number[];
  exports: number[];
  unservedSeries: number[];
  cap: number;
  initialSOC: number;
  effCharge: number;
  source: string;
}

export interface PvCheckItem {
  status: PvCheckStatus;
  title: string;
  detail: string;
}

export interface PvCablesResult {
  idesign: number;
  dropDC: number;
  needDC: number;
  currentAC: number;
  dropAC: number;
  needAC: number;
  reverse: number;
}

export interface PvCalculationSuccess {
  errors: [];
  layouts: PvZoneLayout[];
  limits: PvLimits;
  rows: PvAssignment[];
  blocks: PvInverterBlock[];
  count: number;
  strings: number;
  mppts: number;
  kw: number;
  ac: number;
  annual: number;
  monthly: PvMonthlyPoint[];
  hourly: PvHourlySimResult | null;
  checks: PvCheckItem[];
  targetN: number;
  targetKW: number;
  usedByZone: Record<number, number>;
  batteryKWh: number;
  usable: number;
  required: number;
  dcAc: number;
  cables: PvCablesResult;
  area: number;
  moduleArea: number;
  weight: number;
}

export interface PvCalculationError {
  errors: string[];
}

export type PvCalculationResult = PvCalculationSuccess | PvCalculationError;

export interface PvFieldDescriptor<T extends string = string> {
  label: string;
  key: T;
  hint?: string;
}

export interface PvNasaPowerResult {
  hsp: number[];
  ambient: number[];
  resourceSource: string;
}

export interface PvTourStep {
  targetId?: string;
  view?: PvView;
  badge: string;
  title: string;
  description: string;
  hint?: string;
  icon: string;
}
