export default function VideoPreview({ src }) {
  return (
    <div className="video-preview">
      <video src={src} controls />
    </div>
  );
}
