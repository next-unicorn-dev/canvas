import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getInstagramStatus,
  getInstagramMedia,
  getInstagramMediaDetails,
  uploadToInstagram,
  disconnectInstagram,
  type InstagramStatusResponse,
  type InstagramMediaResponse,
  type InstagramMedia,
  type InstagramUploadRequest,
} from '@/api/instagram'

// Query Keys
export const instagramKeys = {
  all: ['instagram'] as const,
  status: () => [...instagramKeys.all, 'status'] as const,
  media: () => [...instagramKeys.all, 'media'] as const,
  mediaList: (limit: number, after?: string) => [...instagramKeys.media(), { limit, after }] as const,
  mediaDetail: (mediaId: string) => [...instagramKeys.media(), 'detail', mediaId] as const,
}

/**
 * Instagram 연결 상태 조회
 */
export function useInstagramStatus() {
  return useQuery<InstagramStatusResponse, Error>({
    queryKey: instagramKeys.status(),
    queryFn: getInstagramStatus,
    staleTime: 30 * 1000, // 30초
    retry: 1,
  })
}

/**
 * Instagram 미디어 목록 조회
 */
export function useInstagramMedia(limit: number = 25, after?: string, enabled: boolean = true) {
  return useQuery<InstagramMediaResponse, Error>({
    queryKey: instagramKeys.mediaList(limit, after),
    queryFn: () => getInstagramMedia(limit, after),
    enabled,
    staleTime: 60 * 1000, // 1분
  })
}

/**
 * Instagram 미디어 상세 정보 조회
 */
export function useInstagramMediaDetails(mediaId: string, enabled: boolean = true) {
  return useQuery<{ status: string; data: InstagramMedia }, Error>({
    queryKey: instagramKeys.mediaDetail(mediaId),
    queryFn: () => getInstagramMediaDetails(mediaId),
    enabled: enabled && !!mediaId,
    staleTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Instagram 업로드 mutation
 */
export function useInstagramUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: InstagramUploadRequest) => uploadToInstagram(request),
    onSuccess: () => {
      // 업로드 성공 후 미디어 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: instagramKeys.media() })
    },
  })
}

/**
 * Instagram 연결 해제 mutation
 */
export function useInstagramDisconnect() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: disconnectInstagram,
    onSuccess: () => {
      // 연결 해제 후 모든 Instagram 캐시 무효화
      queryClient.invalidateQueries({ queryKey: instagramKeys.all })
    },
  })
}

/**
 * Instagram 캐시 무효화 헬퍼
 */
export function useInvalidateInstagram() {
  const queryClient = useQueryClient()

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: instagramKeys.all }),
    invalidateStatus: () => queryClient.invalidateQueries({ queryKey: instagramKeys.status() }),
    invalidateMedia: () => queryClient.invalidateQueries({ queryKey: instagramKeys.media() }),
  }
}

