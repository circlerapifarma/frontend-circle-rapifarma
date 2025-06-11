import React, { useState, useEffect } from "react";
import { getPresignedUrl } from "./UpFile";

interface ImageDisplayProps {
  imageName: string;
  alt?: string;
  style?: React.CSSProperties;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ imageName, alt, style }) => {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchImageUrl = async () => {
      try {
        const url = await getPresignedUrl(imageName, "get_object");
        setImageUrl(url);
      } catch (err: any) {
        setError("Failed to load image: " + (err.message || err));
      }
    };
    if (imageName) fetchImageUrl();
  }, [imageName]);

  if (error) return <div className="text-red-600 text-xs">{error}</div>;
  if (!imageUrl) return <div className="text-gray-500 text-xs">Cargando imagen...</div>;

  return (
    <div>
      <img
        src={imageUrl}
        alt={alt || imageName}
        style={style || { maxWidth: '100%', height: 'auto', cursor: 'pointer' }}
        onClick={() => setShowModal(true)}
      />
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-70"
          onClick={() => setShowModal(false)}
        >
          <img
            src={imageUrl}
            alt={alt || imageName}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 0 24px #0008' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ImageDisplay;
