"use client";

import { ChangeEvent, useEffect, useCallback, useState, useId } from "react";
import * as faceapi from "face-api.js";
import NextImage from "next/image";

interface IImage {
  id: string;
  file: File;
  imageUrl: string;
}

export default function Home() {
  const [selectedImages, setSelectedImages] = useState<IImage[]>([]);

  const uuid = useId();

  useEffect(() => {
    loadFaceApiModels();
  }, []);

  const loadFaceApiModels = async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/static/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/static/models"),
        faceapi.nets.faceExpressionNet.loadFromUri("/static/models"),
      ]);
    } catch (error) {
      console.error("Failed to load faceapi models:", error);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (!files) {
      return;
    }

    const imagesArray = Array.from(files).map((file) => ({
      id: uuid,
      file,
      imageUrl: URL.createObjectURL(file),
    }));

    setSelectedImages(imagesArray);
  };

  const drawDetections = (
    canvas: HTMLCanvasElement,
    imageElement: HTMLImageElement
  ) => {
    const displaySize = {
      width: imageElement.width,
      height: imageElement.height,
    };

    faceapi.matchDimensions(canvas, displaySize);

    (async () => {
      const detections = await faceapi
        .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();


      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      const context = canvas.getContext("2d");

      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
      }
    })();
  };

  const handleDetections = useCallback(() => {
    selectedImages.forEach(({ file }) => {
      const imageElement = document.getElementById(
        file.name
      ) as HTMLImageElement;

      imageElement.onload = () => {
        const canvas = createCanvasFromMedia(imageElement);
        setupCanvasStyles(canvas, imageElement);
        drawDetections(canvas, imageElement);
        imageElement.parentNode?.appendChild(canvas);
      }
    });
  }, [selectedImages]);

  useEffect(() => {
    handleDetections();
  }, [handleDetections]);

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageChange}
      />

      {selectedImages.map(({ id, imageUrl, file }) => (
        <NextImage
          key={id}
          src={imageUrl}
          alt={`Imagem ${file.name}`}
          id={file.name}
          width={400}
          height={600}
        />
      ))}
    </div>
  );
}

const createCanvasFromMedia = (media: HTMLImageElement) => {
  const canvas = faceapi.createCanvasFromMedia(media);
  return canvas;
};

const setupCanvasStyles = (
  canvas: HTMLCanvasElement,
  imageElement: HTMLImageElement
) => {
  canvas.style.position = "absolute";
  canvas.style.top = imageElement.offsetTop + "px";
  canvas.style.left = imageElement.offsetLeft + "px";
  canvas.style.zIndex = "999";
  canvas.width = imageElement.width;
  canvas.height = imageElement.height;
};
