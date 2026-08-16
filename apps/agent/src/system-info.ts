import os from 'os';
import { getDockerVersion } from './docker-client';

export interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  dockerVersion: string;
  totalMemory: number;
  cpuCount: number;
}

/**
 * Gather system information about the host.
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    dockerVersion: await getDockerVersion(),
    totalMemory: os.totalmem(),
    cpuCount: os.cpus().length,
  };
}
