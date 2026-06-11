import { Logger } from '@nestjs/common';
import NodeClam from 'clamscan';
import { Readable } from 'stream';

const log = new Logger('AvScanner');

let scannerPromise: Promise<any> | null = null;

function getScanner() {
  if (!scannerPromise) {
    scannerPromise = new NodeClam().init({
      clamdscan: {
        host: process.env.CLAMAV_HOST ?? 'localhost',
        port: Number(process.env.CLAMAV_PORT ?? 3310),
        timeout: 120000,
        localFallback: false,
      },
      preference: 'clamdscan',
    });
  }
  return scannerPromise;
}

/**
 * Scans a buffer for viruses via ClamAV (clamd). Throws if infected.
 * No-op when CLAMAV_ENABLED is false (useful in local dev without the daemon).
 */
export async function scanBuffer(buffer: Buffer): Promise<void> {
  if (process.env.CLAMAV_ENABLED !== 'true') {
    log.warn('AV scanning disabled (CLAMAV_ENABLED != true)');
    return;
  }
  const clam = await getScanner();
  const stream = Readable.from(buffer);
  const { isInfected, viruses } = await clam.scanStream(stream);
  if (isInfected) {
    throw new Error(`Infected file rejected: ${viruses?.join(', ')}`);
  }
}
