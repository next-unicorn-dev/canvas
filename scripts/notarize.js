// scripts/notarize.js
import { notarize } from "@electron/notarize";
import path from "path";

export default async function notarizing(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  
  // macOS가 아니면 스킵
  if (electronPlatformName !== "darwin") return;
  
  // 필요한 환경 변수가 없으면 스킵
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_PASSWORD || !process.env.TEAM_ID) {
    return;
  }
  
  // 앱 이름을 동적으로 가져오기
  const productName = packager.appInfo.productName || "Prism AI";
  const appName = `${productName}.app`;
  const appPath = path.join(appOutDir, appName);
  
  try {
    return await notarize({
      appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_PASSWORD,
      teamId: process.env.TEAM_ID,
    });
  } catch (error) {
    console.error("Notarization failed:", error);
    // Notarization 실패해도 빌드는 계속 진행
  }
}
