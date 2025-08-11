type ScreenInfo = {
  screenWidth?: number;
  screenHeight?: number;
};
const screenInfo: ScreenInfo = {};

export function setScreenInfo(info: ScreenInfo) {
  Object.assign(screenInfo, info);
}

export function getScreenInfo() {
  return screenInfo;
}
