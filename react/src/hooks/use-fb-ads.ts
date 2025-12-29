import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getFbAdAccounts,
    getFbAccountInsights,
    getFbCampaigns,
    getFbAdSets,
    getFbAds,
    getFbPages,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    updateCampaignStatus,
    createAdSet,
    updateAdSet,
    deleteAdSet,
    updateAdSetStatus,
    uploadAdImage,
    createAdCreative,
    createAd,
    updateAd,
    deleteAd,
    updateAdStatus,
    type FbAdAccount,
    type FbAdInsights,
    type FbCampaign,
    type FbAdSet,
    type FbAd,
    type FbPage,
    type DatePreset,
    type CampaignCreateInput,
    type CampaignUpdateInput,
    type AdSetCreateInput,
    type AdSetUpdateInput,
    type AdCreativeInput,
    type AdCreateInput,
    type AdUpdateInput,
    type ImageUploadResponse,
} from '@/api/fb-ads'

// Query Keys
export const fbAdsKeys = {
    all: ['fbAds'] as const,
    accounts: () => [...fbAdsKeys.all, 'accounts'] as const,
    pages: () => [...fbAdsKeys.all, 'pages'] as const,
    accountInsights: (accountId: string, datePreset: DatePreset) =>
        [...fbAdsKeys.all, 'insights', accountId, datePreset] as const,
    campaigns: (accountId: string, datePreset: DatePreset) =>
        [...fbAdsKeys.all, 'campaigns', accountId, datePreset] as const,
    adsets: (accountId: string, campaignId: string | undefined, datePreset: DatePreset) =>
        [...fbAdsKeys.all, 'adsets', accountId, campaignId, datePreset] as const,
    ads: (accountId: string, campaignId: string | undefined, adsetId: string | undefined, datePreset: DatePreset) =>
        [...fbAdsKeys.all, 'ads', accountId, campaignId, adsetId, datePreset] as const,
}

/**
 * Facebook 광고 계정 목록 조회
 */
export function useFbAdAccounts(enabled: boolean = true) {
    return useQuery<FbAdAccount[], Error>({
        queryKey: fbAdsKeys.accounts(),
        queryFn: getFbAdAccounts,
        enabled,
        staleTime: 5 * 60 * 1000, // 5분
    })
}

/**
 * 광고 계정 인사이트 조회
 */
export function useFbAccountInsights(
    accountId: string,
    datePreset: DatePreset = 'last_30d',
    enabled: boolean = true
) {
    return useQuery<FbAdInsights, Error>({
        queryKey: fbAdsKeys.accountInsights(accountId, datePreset),
        queryFn: () => getFbAccountInsights(accountId, datePreset),
        enabled: enabled && !!accountId,
        staleTime: 5 * 60 * 1000,
    })
}

/**
 * 캠페인 목록 조회
 */
export function useFbCampaigns(
    accountId: string,
    datePreset: DatePreset = 'last_30d',
    limit: number = 50,
    enabled: boolean = true
) {
    return useQuery<FbCampaign[], Error>({
        queryKey: fbAdsKeys.campaigns(accountId, datePreset),
        queryFn: () => getFbCampaigns(accountId, datePreset, limit),
        enabled: enabled && !!accountId,
        staleTime: 5 * 60 * 1000,
    })
}

/**
 * 광고 세트 목록 조회
 */
export function useFbAdSets(
    accountId: string,
    campaignId?: string,
    datePreset: DatePreset = 'last_30d',
    limit: number = 50,
    enabled: boolean = true
) {
    return useQuery<FbAdSet[], Error>({
        queryKey: fbAdsKeys.adsets(accountId, campaignId, datePreset),
        queryFn: () => getFbAdSets(accountId, campaignId, datePreset, limit),
        enabled: enabled && !!accountId,
        staleTime: 5 * 60 * 1000,
    })
}

/**
 * 광고 목록 조회
 */
export function useFbAds(
    accountId: string,
    campaignId?: string,
    adsetId?: string,
    datePreset: DatePreset = 'last_30d',
    limit: number = 50,
    enabled: boolean = true
) {
    return useQuery<FbAd[], Error>({
        queryKey: fbAdsKeys.ads(accountId, campaignId, adsetId, datePreset),
        queryFn: () => getFbAds(accountId, campaignId, adsetId, datePreset, limit),
        enabled: enabled && !!accountId,
        staleTime: 5 * 60 * 1000,
    })
}

/**
 * Facebook 페이지 목록 조회
 */
export function useFbPages(enabled: boolean = true) {
    return useQuery<FbPage[], Error>({
        queryKey: fbAdsKeys.pages(),
        queryFn: getFbPages,
        enabled,
        staleTime: 10 * 60 * 1000, // 10분
    })
}

// ============== Mutation Hooks ==============

/**
 * 캠페인 생성
 */
export function useCreateCampaign(accountId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: CampaignCreateInput) => createCampaign(accountId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: fbAdsKeys.all })
        },
    })
}

/**
 * 캠페인 수정
 */
export function useUpdateCampaign() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ campaignId, data }: { campaignId: string; data: CampaignUpdateInput }) =>
            updateCampaign(campaignId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: fbAdsKeys.all })
        },
    })
}

/**
 * 캠페인 삭제
 */
export function useDeleteCampaign() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (campaignId: string) => deleteCampaign(campaignId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: fbAdsKeys.all })
        },
    })
}

/**
 * 캠페인 상태 변경
 */
export function useUpdateCampaignStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ campaignId, status }: { campaignId: string; status: 'ACTIVE' | 'PAUSED' }) =>
            updateCampaignStatus(campaignId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: fbAdsKeys.all })
        },
    })
}

/**
 * 광고 세트 생성
 */
export function useCreateAdSet(accountId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: AdSetCreateInput) => createAdSet(accountId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: fbAdsKeys.all })
        },
    })
}

/**
 * 광고 세트 수정
 */
export function useUpdateAdSet() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ adsetId, data }: { adsetId: string; data: AdSetUpdateInput }) =>
            updateAdSet(adsetId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: fbAdsKeys.all })
        },
    })
}

/**
 * 광고 세트 삭제
 */
export function useDeleteAdSet() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (adsetId: string) => deleteAdSet(adsetId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: fbAdsKeys.all })
        },
    })
}

/**
 * 광고 세트 상태 변경
 */
export function useUpdateAdSetStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ adsetId, status }: { adsetId: string; status: 'ACTIVE' | 'PAUSED' }) =>
            updateAdSetStatus(adsetId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: fbAdsKeys.all })
        },
    })
}

/**
 * 광고 이미지 업로드
 */
export function useUploadAdImage(accountId: string) {
    return useMutation({
        mutationFn: (file: File) => uploadAdImage(accountId, file),
    })
}

/**
 * 광고 소재 생성
 */
export function useCreateAdCreative(accountId: string) {
    return useMutation({
        mutationFn: (data: AdCreativeInput) => createAdCreative(accountId, data),
    })
}

/**
 * 광고 생성
 */
export function useCreateAd(accountId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: AdCreateInput) => createAd(accountId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: fbAdsKeys.all })
        },
    })
}

/**
 * 광고 수정
 */
export function useUpdateAd() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ adId, data }: { adId: string; data: AdUpdateInput }) =>
            updateAd(adId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: fbAdsKeys.all })
        },
    })
}

/**
 * 광고 삭제
 */
export function useDeleteAd() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (adId: string) => deleteAd(adId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: fbAdsKeys.all })
        },
    })
}

/**
 * 광고 상태 변경
 */
export function useUpdateAdStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ adId, status }: { adId: string; status: 'ACTIVE' | 'PAUSED' }) =>
            updateAdStatus(adId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: fbAdsKeys.all })
        },
    })
}

// Re-export types for convenience
export type {
    FbAdAccount,
    FbAdInsights,
    FbCampaign,
    FbAdSet,
    FbAd,
    FbPage,
    DatePreset,
    CampaignCreateInput,
    CampaignUpdateInput,
    AdSetCreateInput,
    AdSetUpdateInput,
    AdCreativeInput,
    AdCreateInput,
    AdUpdateInput,
    ImageUploadResponse,
}
