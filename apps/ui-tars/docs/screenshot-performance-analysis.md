# Windows 截图性能瓶颈分析

## 问题描述
- Mac 系统：截图耗时约 300ms
- Windows 系统：截图耗时最慢可达 2 秒（约 6-7 倍慢）

## 当前实现分析

### 截图流程（`NutJSElectronOperator.screenshot()`）

```43:122:apps/ui-tars/src/main/agent/operator.ts
  public async screenshot(): Promise<ScreenshotOutput> {
    const {
      physicalSize,
      logicalSize,
      scaleFactor,
      id: primaryDisplayId,
    } = getScreenSize(); // Logical = Physical / scaleX

    logger.info(
      '[screenshot] [primaryDisplay]',
      'logicalSize:',
      logicalSize,
      'scaleFactor:',
      scaleFactor,
    );

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(logicalSize.width),
        height: Math.round(logicalSize.height),
      },
    });
    const primarySource =
      sources.find(
        (source) => source.display_id === primaryDisplayId.toString(),
      ) || sources[0];

    if (!primarySource) {
      logger.error('[screenshot] Primary display source not found', {
        primaryDisplayId,
        availableSources: sources.map((s) => s.display_id),
      });
      // fallback to default screenshot
      return await super.screenshot();
    }

    const screenshot = primarySource.thumbnail;

    // Log original screenshot dimensions before compression
    const originalWidth = screenshot.getSize().width;
    const originalHeight = screenshot.getSize().height;
    logger.info(
      '[screenshot] Original size before compression:',
      `${originalWidth}x${originalHeight} (${originalWidth * originalHeight} pixels)`,
    );

    // Apply resolution scaling to reduce image size for faster inference
    const scaledWidth = Math.round(
      physicalSize.width * this.resolutionScaleFactor,
    );
    const scaledHeight = Math.round(
      physicalSize.height * this.resolutionScaleFactor,
    );

    const resized = screenshot.resize({
      width: scaledWidth,
      height: scaledHeight,
    });

    // Convert to JPEG with configurable quality
    const jpegBuffer = resized.toJPEG(this.screenshotJpegQuality);
    const compressedBase64 = jpegBuffer.toString('base64');

    // Log compressed image dimensions and size
    logger.info(
      '[screenshot] Compressed size after JPEG compression:',
      `${scaledWidth}x${scaledHeight} (${scaledWidth * scaledHeight} pixels),`,
      `Resolution scale: ${this.resolutionScaleFactor},`,
      `Quality: ${this.screenshotJpegQuality}%,`,
      `Base64 length: ${compressedBase64.length} characters`,
    );

    // Return original scaleFactor (DPI scale), not modified by resolution scale
    // Coordinate restoration will be handled in execute() method
    return {
      base64: compressedBase64,
      scaleFactor,
    };
  }
```

## 性能瓶颈分析

### 1. **desktopCapturer.getSources() 在 Windows 上的性能问题** ⚠️ **主要瓶颈**

**问题：**
- Windows 上 `desktopCapturer.getSources()` 的实现比 Mac 慢得多
- Windows 使用 GDI+ 或 DirectX 进行屏幕捕获，性能不如 Mac 的原生 API
- `thumbnailSize` 参数在 Windows 上可能不会真正优化性能，系统可能先捕获全分辨率再缩放

**影响：**
- 在高分辨率显示器（如 4K）上，Windows 可能需要捕获完整的屏幕缓冲区
- 即使指定了 `thumbnailSize`，Windows 可能仍会进行完整捕获

### 2. **thumbnailSize 参数使用不当** ⚠️ **主要瓶颈**

**问题：**
```typescript
thumbnailSize: {
  width: Math.round(logicalSize.width),  // 例如 1920 或 3840
  height: Math.round(logicalSize.height), // 例如 1080 或 2160
}
```

- 代码使用了完整的 `logicalSize` 作为 `thumbnailSize`
- 在 Windows 上，这可能导致系统捕获完整分辨率（即使最终会缩放）
- 应该直接使用目标缩放后的尺寸，而不是逻辑尺寸

**优化建议：**
- 直接使用 `scaledWidth` 和 `scaledHeight` 作为 `thumbnailSize`
- 这样可以减少 Windows 需要处理的像素数量

### 3. **图片处理操作（resize + toJPEG）** ⚠️ **次要瓶颈**

**问题：**
- 即使 `desktopCapturer` 返回了正确尺寸的缩略图，代码仍会再次 `resize()`
- `toJPEG()` 编码操作在高分辨率下可能较慢

**影响：**
- 如果 `thumbnailSize` 设置正确，这部分开销应该较小
- 但如果 `thumbnailSize` 无效，这部分会成为主要瓶颈

### 4. **Windows 特定的系统调用开销**

**问题：**
- Windows 的屏幕捕获 API 需要更多的系统调用
- 可能需要锁定屏幕缓冲区，导致额外延迟
- 多显示器环境下的处理可能更复杂

## 优化建议

### 优化方案 1：优化 thumbnailSize 参数（推荐）⭐

**修改 `desktopCapturer.getSources()` 调用，直接使用目标缩放尺寸：**

```typescript
// 计算目标尺寸（提前计算）
const scaledWidth = Math.round(
  physicalSize.width * this.resolutionScaleFactor,
);
const scaledHeight = Math.round(
  physicalSize.height * this.resolutionScaleFactor,
);

// 使用目标尺寸作为 thumbnailSize
const sources = await desktopCapturer.getSources({
  types: ['screen'],
  thumbnailSize: {
    width: scaledWidth,   // 使用缩放后的尺寸，而不是 logicalSize
    height: scaledHeight,
  },
});
```

**预期效果：**
- 减少 Windows 需要处理的像素数量（从 1920x1080 降到 1344x756，约 50% 减少）
- 如果 Windows 的 `thumbnailSize` 实现有效，可以显著提升性能

### 优化方案 2：添加性能监控和降级策略

**添加性能监控：**

```typescript
public async screenshot(): Promise<ScreenshotOutput> {
  const startTime = Date.now();
  
  // ... 现有代码 ...
  
  const getSourcesStart = Date.now();
  const sources = await desktopCapturer.getSources({...});
  const getSourcesDuration = Date.now() - getSourcesStart;
  logger.info(`[screenshot] desktopCapturer.getSources took ${getSourcesDuration}ms`);
  
  // ... 其余代码 ...
  
  const totalDuration = Date.now() - startTime;
  logger.info(`[screenshot] Total screenshot time: ${totalDuration}ms`);
}
```

### 优化方案 3：Windows 特定的优化路径

**为 Windows 提供专门的优化路径：**

```typescript
import * as env from '@main/env';

public async screenshot(): Promise<ScreenshotOutput> {
  // ... 获取屏幕尺寸 ...
  
  // Windows 特定优化：使用更小的 thumbnailSize
  const thumbnailSize = env.isWindows
    ? {
        // Windows 上直接使用目标缩放尺寸
        width: Math.round(physicalSize.width * this.resolutionScaleFactor),
        height: Math.round(physicalSize.height * this.resolutionScaleFactor),
      }
    : {
        // Mac 上可以使用 logicalSize（性能更好）
        width: Math.round(logicalSize.width),
        height: Math.round(logicalSize.height),
      };
  
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize,
  });
  
  // ... 其余代码 ...
}
```

### 优化方案 4：使用 NutJS screen.grab() 作为备选方法（已实现）⭐

**实现了一个智能的混合方案：**

1. **自动性能检测和降级**：
   - 首次使用 Electron 的 `desktopCapturer.getSources()` 方法
   - 如果耗时超过阈值（1000ms），自动切换到 NutJS 的 `screen.grab()` 方法
   - 之后的所有截图都会使用更快的 NutJS 方法

2. **平台特定优化**：
   - Mac：始终使用 Electron 方法（性能更好）
   - Windows：根据性能自动选择最佳方法

3. **详细的性能监控**：
   - 分别记录每个步骤的耗时（grab、toRGB、Jimp、resize、编码等）
   - 便于进一步优化和问题定位

**预期效果：**
- 如果 NutJS 方法更快，可以将截图时间从 1600ms 降到 300-500ms
- 自动选择最佳方法，无需手动配置

### 优化方案 5：考虑使用替代截图方法（长期方案）

**如果 `