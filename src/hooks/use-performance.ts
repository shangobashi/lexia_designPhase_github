import { useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  name: string;
  duration: number;
  type: 'navigation' | 'render' | 'interaction';
}

/**
 * Hook for monitoring performance metrics
 */
export const usePerformance = () => {
  // Measure component render time
  const measureRender = useCallback((componentName: string, startTime: number) => {
    const duration = performance.now() - startTime;
    logMetric({
      name: `${componentName}-render`,
      duration,
      type: 'render',
    });
  }, []);

  // Measure user interactions
  const measureInteraction = useCallback((interactionName: string, startTime: number) => {
    const duration = performance.now() - startTime;
    logMetric({
      name: `${interactionName}-interaction`,
      duration,
      type: 'interaction',
    });
  }, []);

  // Log performance metrics
  const logMetric = useCallback((metric: PerformanceMetrics) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance [${metric.type}]: ${metric.name} took ${metric.duration.toFixed(2)}ms`);
    }

    // In production, you might want to send this to an analytics service
    if (process.env.NODE_ENV === 'production' && metric.duration > 100) {
      // Example: Send to analytics
      // analytics.track('performance_metric', metric);
    }
  }, []);

  // Monitor Core Web Vitals
  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          logMetric({
            name: 'LCP',
            duration: entry.startTime,
            type: 'navigation',
          });
        }
      });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          logMetric({
            name: 'FID',
            duration: (entry as any).processingStart - entry.startTime,
            type: 'interaction',
          });
        }
      });

      // Cumulative Layout Shift (CLS)
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          logMetric({
            name: 'CLS',
            duration: (entry as any).value,
            type: 'render',
          });
        }
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        fidObserver.observe({ entryTypes: ['first-input'] });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Performance observer not supported:', error);
      }

      return () => {
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    }
  }, [logMetric]);

  return {
    measureRender,
    measureInteraction,
    logMetric,
  };
};

/**
 * Higher-order component for measuring component render performance
 */
export const withPerformanceMonitoring = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) => {
  const MonitoredComponent = (props: P) => {
    const { measureRender } = usePerformance();
    const startTime = performance.now();

    useEffect(() => {
      measureRender(componentName, startTime);
    }, [measureRender, startTime]);

    return <WrappedComponent {...props} />;
  };

  MonitoredComponent.displayName = `withPerformanceMonitoring(${componentName})`;
  return MonitoredComponent;
};