import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export interface ContainerInfo {
  containerId: string;
  name: string;
  image: string;
  status: string;
  state: string;
}

export interface ContainerStats {
  containerId: string;
  cpuPercent: number;
  memUsage: number;
  memLimit: number;
  netRx: number;
  netTx: number;
}

/**
 * List all containers (running + stopped).
 */
export async function listContainers(): Promise<ContainerInfo[]> {
  const containers = await docker.listContainers({ all: true });

  return containers.map((c) => ({
    containerId: c.Id.substring(0, 12),
    name: c.Names[0]?.replace(/^\//, '') || 'unknown',
    image: c.Image,
    status: c.Status,
    state: c.State,
  }));
}

/**
 * Get resource stats for all running containers.
 */
export async function getContainerStats(): Promise<ContainerStats[]> {
  const containers = await docker.listContainers({ filters: { status: ['running'] } });
  const statsPromises = containers.map(async (c) => {
    try {
      const container = docker.getContainer(c.Id);
      const stats = await container.stats({ stream: false }) as any;

      // Calculate CPU percentage
      const cpuDelta =
        stats.cpu_stats.cpu_usage.total_usage -
        stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta =
        stats.cpu_stats.system_cpu_usage -
        stats.precpu_stats.system_cpu_usage;
      const cpuCount = stats.cpu_stats.online_cpus || 1;
      const cpuPercent =
        systemDelta > 0 ? (cpuDelta / systemDelta) * cpuCount * 100 : 0;

      // Memory
      const memUsage = stats.memory_stats.usage || 0;
      const memLimit = stats.memory_stats.limit || 0;

      // Network I/O
      let netRx = 0;
      let netTx = 0;
      if (stats.networks) {
        for (const iface of Object.values(stats.networks) as any[]) {
          netRx += iface.rx_bytes || 0;
          netTx += iface.tx_bytes || 0;
        }
      }

      return {
        containerId: c.Id.substring(0, 12),
        cpuPercent: Math.round(cpuPercent * 100) / 100,
        memUsage,
        memLimit,
        netRx,
        netTx,
      };
    } catch (err) {
      console.error(`Failed to get stats for container ${c.Id.substring(0, 12)}:`, err);
      return null;
    }
  });

  const results = await Promise.all(statsPromises);
  return results.filter((s): s is ContainerStats => s !== null);
}

/**
 * Get Docker version info.
 */
export async function getDockerVersion(): Promise<string> {
  try {
    const info = await docker.version();
    return info.Version || 'unknown';
  } catch {
    return 'unknown';
  }
}
