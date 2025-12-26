
export enum AnomalySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AnomalyEvent {
  id: string;
  timestamp: number;
  type: string;
  category?: 'Manipulated Sign' | 'Image Noise' | 'Logic Error' | 'General';
  description: string;
  severity: AnomalySeverity;
}

export interface SystemStatus {
  isMonitoring: boolean;
  threatLevel: number; // 0-100
  uptime: number;
  lastDetection: number | null;
}
