/**
 * Settings API - 설정 관련 API 인터페이스
 *
 * 이 모듈은 백엔드 설정 서비스와 상호작용하는 모든 API 함수를 제공합니다:
 * - 설정 파일 존재 여부 확인
 * - 설정 조회 및 업데이트
 * - 프록시 설정 관리
 * - 프록시 연결 테스트
 */

/**
 * 설정 파일 존재 여부 확인
 *
 * @returns Promise<{ exists: boolean }> 설정 파일 존재 여부 상태 반환
 * @description 서버 측에서 설정 파일이 이미 생성되었는지 확인하는 데 사용되며, 보통 앱 초기화 시 호출됩니다
 * @example
 * const { exists } = await getSettingsExists();
 * if (!exists) {
 *   // 초기 설정 마법사 표시
 * }
 */
export async function getSettingsFileExists(): Promise<{ exists: boolean }> {
  const response = await fetch('/api/settings/exists')
  return await response.json()
}

/**
 * 모든 설정 구성 조회
 *
 * @returns Promise<Record<string, unknown>> 모든 설정을 포함하는 객체 반환
 * @description 전체 설정 구성을 가져오며, 민감한 정보(비밀번호 등)는 마스킹 처리됩니다
 * @note 반환된 설정은 기본 설정과 병합되어 모든 필수 키가 존재하는지 확인합니다
 * @example
 * const settings = await getSettings();
 * const proxyConfig = settings.proxy;
 * const systemPrompt = settings.system_prompt;
 */
export async function getSettings(): Promise<Record<string, unknown>> {
  const response = await fetch('/api/settings')
  return await response.json()
}

/**
 * 설정 구성 업데이트
 *
 * @param settings - 업데이트할 설정 객체, 부분 설정 가능
 * @returns Promise<{ status: string; message: string }> 작업 결과 반환
 * @description 지정된 설정 항목을 업데이트하며, 기존 설정과 병합하므로 완전히 교체되지 않습니다
 * @example
 * const result = await updateSettings({
 *   proxy: 'http://proxy.example.com:8080',  // 또는 '' 또는 'system'
 *   system_prompt: 'You are a helpful assistant.'
 * });
 *
 * if (result.status === 'success') {
 *   console.log('Settings saved successfully');
 * }
 */
export async function updateSettings(
  settings: Record<string, unknown>
): Promise<{
  status: string
  message: string
}> {
  const response = await fetch('/api/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  })
  return await response.json()
}

/**
 * 프록시 설정 조회
 *
 * @returns Promise<Record<string, unknown>> 프록시 설정 객체 반환
 * @description 프록시 관련 설정만 가져오며, 다른 설정 항목은 포함하지 않습니다
 * @example
 * const proxySettings = await getProxySettings();
 * console.log('Proxy setting:', proxySettings.proxy);
 * // 가능한 값:
 * // '' - 프록시 사용 안 함
 * // 'system' - 시스템 프록시 사용
 * // 'http://proxy.example.com:8080' - 지정된 프록시 사용
 */
export async function getProxySettings(): Promise<Record<string, unknown>> {
  const response = await fetch('/api/settings/proxy')
  return await response.json()
}

/**
 * 프록시 설정 업데이트
 *
 * @param proxyConfig - 프록시 설정 객체, proxy 필드 포함
 * @returns Promise<{ status: string; message: string }> 작업 결과 반환
 * @description 프록시 관련 설정만 업데이트하며, 다른 설정 항목에는 영향을 주지 않습니다
 * @example
 * // 프록시 사용 안 함
 * const result1 = await updateProxySettings({ proxy: '' });
 *
 * // 시스템 프록시 사용
 * const result2 = await updateProxySettings({ proxy: 'system' });
 *
 * // 지정된 프록시 사용
 * const result3 = await updateProxySettings({
 *   proxy: 'http://proxy.example.com:8080'
 * });
 *
 * if (result.status === 'success') {
 *   console.log('Proxy settings updated');
 * }
 */
export async function updateProxySettings(
  proxyConfig: Record<string, unknown>
): Promise<{
  status: string
  message: string
}> {
  const response = await fetch('/api/settings/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(proxyConfig),
  })
  return await response.json()
}

// 파일 시스템 브라우징 관련 API
export const browseFolderApi = async (path: string = '') => {
  const response = await fetch(
    `/api/browse_filesystem?path=${encodeURIComponent(path)}`
  )
  if (!response.ok) {
    throw new Error('Failed to browse folder')
  }
  return response.json()
}

export const getMediaFilesApi = async (path: string) => {
  const response = await fetch(
    `/api/get_media_files?path=${encodeURIComponent(path)}`
  )
  if (!response.ok) {
    throw new Error('Failed to get media files')
  }
  return response.json()
}

export const openFolderInExplorer = async (path: string) => {
  const response = await fetch('/api/open_folder_in_explorer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path }),
  })
  if (!response.ok) {
    throw new Error('Failed to open folder in explorer')
  }
  return response.json()
}

export const getFileThumbnailApi = async (filePath: string) => {
  const response = await fetch(
    `/api/get_file_thumbnail?file_path=${encodeURIComponent(filePath)}`
  )
  if (!response.ok) {
    throw new Error('Failed to get file thumbnail')
  }
  return response.json()
}

// 파일 서비스 URL 조회
export const getFileServiceUrl = (filePath: string) => {
  return `/api/serve_file?file_path=${encodeURIComponent(filePath)}`
}

// 파일 상세 정보 조회
export const getFileInfoApi = async (filePath: string) => {
  const response = await fetch(
    `/api/get_file_info?file_path=${encodeURIComponent(filePath)}`
  )
  if (!response.ok) {
    throw new Error('Failed to get file info')
  }
  return response.json()
}

// 사용자의 My Assets 디렉토리 경로 조회
export const getMyAssetsDirPath = async () => {
  const response = await fetch('/api/settings/my_assets_dir_path')
  const result = await response.json()
  return result
}

// PNG 메타데이터는 이제 프론트엔드에서 직접 읽음 (readPNGMetadata in @/utils/pngMetadata)
// 이렇게 하면 더 빠르고 백엔드 처리 오버헤드를 피할 수 있음
