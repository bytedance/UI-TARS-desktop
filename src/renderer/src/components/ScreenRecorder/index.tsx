import { useScreenRecord } from '@renderer/hooks/useScreenRecord';

interface ScreenRecorderProps {
  watermarkText?: string;
}

export const ScreenRecorder: React.FC<ScreenRecorderProps> = (props) => {
  // eslint-disable-next-line react/prop-types
  const { watermarkText = `© ${new Date().getFullYear()} UI-TARS Desktop` } =
    props;
  const {
    isRecording,
    canSaveRecording,
    startRecording,
    stopRecording,
    saveRecording,
    recordRefs,
  } = useScreenRecord(watermarkText);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            padding: '10px 20px',
            backgroundColor: isRecording ? '#ff4444' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {isRecording ? '停止录制' : '开始录制'}
        </button>
      </div>
      {canSaveRecording && (
        <div style={{ marginBottom: '20px' }}>
          <button onClick={saveRecording}>保存视频</button>
        </div>
      )}
      <div>
        <video ref={recordRefs.videoRef} style={{ display: 'none' }} />
        <canvas ref={recordRefs.canvasRef} />
      </div>
    </div>
  );
};
