import { useQuery } from '@tanstack/react-query'
import { getAdPerformance, type AdPerformanceData } from '@/api/ad-performance'

// Query Keys
export const adPerformanceKeys = {
  all: ['adPerformance'] as const,
  data: () => [...adPerformanceKeys.all, 'data'] as const,
}

/**
 * 광고 성과 데이터 조회
 */
export function useAdPerformance(enabled: boolean = true) {
  return useQuery<AdPerformanceData, Error>({
    queryKey: adPerformanceKeys.data(),
    queryFn: getAdPerformance,
    enabled,
    staleTime: 5 * 60 * 1000, // 5분
  })
}

