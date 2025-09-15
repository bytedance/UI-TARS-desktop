/**
 * Performance monitoring utility for tracking event processing performance
 */
export class PerformanceMonitor {
  private static measurements = new Map<string, number[]>();
  private static readonly MAX_MEASUREMENTS = 100;

  /**
   * Start measuring performance for a given operation
   */
  static startMeasurement(operationId: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordMeasurement(operationId, duration);

      // Log performance violations (similar to browser warnings)
      if (duration > 16) {
        console.warn(`[Performance] '${operationId}' handler took ${Math.round(duration)}ms`);
      }
    };
  }

  /**
   * Record a measurement for an operation
   */
  private static recordMeasurement(operationId: string, duration: number): void {
    if (!this.measurements.has(operationId)) {
      this.measurements.set(operationId, []);
    }

    const measurements = this.measurements.get(operationId)!;
    measurements.push(duration);

    // Keep only recent measurements
    if (measurements.length > this.MAX_MEASUREMENTS) {
      measurements.shift();
    }
  }

  /**
   * Get performance statistics for an operation
   */
  static getStats(operationId: string): {
    count: number;
    average: number;
    max: number;
    min: number;
    recent: number;
  } | null {
    const measurements = this.measurements.get(operationId);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const count = measurements.length;
    const sum = measurements.reduce((a, b) => a + b, 0);
    const average = sum / count;
    const max = Math.max(...measurements);
    const min = Math.min(...measurements);
    const recent = measurements[measurements.length - 1];

    return { count, average, max, min, recent };
  }

  /**
   * Get all performance statistics
   */
  static getAllStats(): Record<string, ReturnType<typeof PerformanceMonitor.getStats>> {
    const result: Record<string, ReturnType<typeof PerformanceMonitor.getStats>> = {};

    for (const operationId of Array.from(this.measurements.keys())) {
      result[operationId] = this.getStats(operationId);
    }

    return result;
  }

  /**
   * Clear all measurements
   */
  static clear(): void {
    this.measurements.clear();
  }

  /**
   * Log performance summary to console
   */
  static logSummary(): void {
    const stats = this.getAllStats();

    console.group('Performance Summary');
    Object.entries(stats).forEach(([operationId, stat]) => {
      if (stat) {
        console.log(
          `${operationId}: avg=${stat.average.toFixed(1)}ms, max=${stat.max.toFixed(1)}ms, count=${stat.count}`,
        );
      }
    });
    console.groupEnd();
  }
}

/**
 * Decorator for measuring function performance
 */
export function measurePerformance(operationId: string) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const endMeasurement = PerformanceMonitor.startMeasurement(`${operationId}.${propertyKey}`);

      try {
        const result = originalMethod.apply(this, args);

        if (result instanceof Promise) {
          return result.finally(() => endMeasurement());
        } else {
          endMeasurement();
          return result;
        }
      } catch (error) {
        endMeasurement();
        throw error;
      }
    };

    return descriptor;
  };
}
