import { checkMongoHealth } from '../db/mongodb';
import { checkFirestoreAdminHealth } from '../db/firestoreAdmin';

export interface HealthStatusResult {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  version: string;
  environment: string;
  timestamp: string;
  databases: {
    mongodb: {
      status: 'CONNECTED' | 'UNCONFIGURED' | 'DISCONNECTED';
      latencyMs?: number;
    };
    firestoreAdmin: {
      status: 'CONNECTED' | 'UNCONFIGURED' | 'DISCONNECTED';
    };
  };
}

export async function getHealthStatus(): Promise<HealthStatusResult> {
  const [mongoHealth, firestoreHealth] = await Promise.all([
    checkMongoHealth(),
    checkFirestoreAdminHealth(),
  ]);

  const isDegraded =
    mongoHealth.status === 'DISCONNECTED' || firestoreHealth.status === 'DISCONNECTED';

  return {
    status: isDegraded ? 'DEGRADED' : 'HEALTHY',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    databases: {
      mongodb: mongoHealth,
      firestoreAdmin: firestoreHealth,
    },
  };
}
