import { useState, useRef, useEffect } from 'react'
import './App.css'
import * as bodyPix from '@tensorflow-models/body-pix'
import '@tensorflow/tfjs'

function ImageProcessor() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState(null)
  const canvasRef = useRef(null)
  const [blurAmount, setBlurAmount] = useState(10)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/')) {
        setSelectedFile(file)
        setProcessedImage(null)
      } else {
        alert('Please upload an image file')
      }
    }
  }

  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file)
        setProcessedImage(null)
      } else {
        alert('Please upload an image file')
      }
    }
  }

  // Load BodyPix model on component mount
  useEffect(() => {
    async function loadModel() {
      try {
        const loadedModel = await bodyPix.load({
          architecture: 'MobileNetV1',
          outputStride: 16,
          multiplier: 0.75,
          quantBytes: 2
        });
        setModel(loadedModel);
      } catch (error) {
        console.error('Error loading BodyPix model:', error);
      }
    }
    loadModel();
  }, []);

  const processImage = async () => {
    if (!selectedFile || !model) {
      alert('Please select an image and wait for the model to load')
      return
    }

    setLoading(true)

    try {
      const img = new Image()
      const objectUrl = URL.createObjectURL(selectedFile)
      
      img.onload = async () => {
        // Set up canvas
        const canvas = canvasRef.current
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')

        // Get person segmentation
        const segmentation = await model.segmentPerson(img, {
          flipHorizontal: false,
          internalResolution: 'medium',
          segmentationThreshold: 0.7
        })

        // Create separate canvases for the person and background
        const personCanvas = document.createElement('canvas')
        const bgCanvas = document.createElement('canvas')
        personCanvas.width = bgCanvas.width = img.width
        personCanvas.height = bgCanvas.height = img.height
        const personCtx = personCanvas.getContext('2d')
        const bgCtx = bgCanvas.getContext('2d')

        // Draw original image on both canvases
        personCtx.drawImage(img, 0, 0)
        bgCtx.drawImage(img, 0, 0)

        // Create mask for person
        const imageData = personCtx.getImageData(0, 0, canvas.width, canvas.height)
        const pixels = imageData.data
        for (let i = 0; i < segmentation.data.length; i++) {
          const isForeground = segmentation.data[i]
          if (!isForeground) {
            pixels[i * 4 + 3] = 0 // Set alpha to 0 for background
          }
        }
        personCtx.putImageData(imageData, 0, 0)

        // Apply blur to background
        bgCtx.filter = `blur(${blurAmount}px)`
        bgCtx.drawImage(img, 0, 0)

        // Combine the images
        ctx.filter = 'none'
        ctx.drawImage(bgCanvas, 0, 0) // Draw blurred background
        ctx.drawImage(personCanvas, 0, 0) // Draw person on top

        // Convert to data URL and set as processed image
        setProcessedImage(canvas.toDataURL('image/jpeg'))
        setLoading(false)
        URL.revokeObjectURL(objectUrl)
      }

      img.src = objectUrl
    } catch (error) {
      console.error('Error processing image:', error)
      alert('Error processing image. Please try again.')
      setLoading(false)
    }
  }

  const handleImageClick = () => {
    if (processedImage) {
      // Create a temporary link element
      const link = document.createElement('a')
      link.href = processedImage
      link.download = `blurred_${selectedFile.name}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="container">
      <h1>Image Background Blur</h1>
      <div className="upload-section">
        <div 
          className={`file-drop-zone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="file-input"
            title="Choose an image"
          />
          <div className="drop-zone-content">
            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="drop-text">
              Drag and drop an image here, or click to select
            </p>
          </div>
        </div>
        <div className="blur-control">
          <label>Blur Intensity:</label>
          <input
            type="range"
            min="1"
            max="20"
            value={blurAmount}
            onChange={(e) => {
              setBlurAmount(Number(e.target.value))
              if (selectedFile && processedImage) {
                processImage()
              }
            }}
            className="blur-slider"
          />
          <span>{blurAmount}px</span>
        </div>
        <button
          onClick={processImage}
          disabled={loading || !model}
          className="process-button"
        >
          {loading ? 'Processing...' : !model ? 'Loading Model...' : 'Blur Background'}
        </button>
      </div>
      
      <div className="images-container">
        {selectedFile && (
          <div className="image-box">
            <h3>{processedImage ? 'Processed Image' : 'Original Image'}</h3>
            <img
              src={processedImage || URL.createObjectURL(selectedFile)}
              alt={processedImage ? 'Processed' : 'Original'}
              className={`preview-image ${processedImage ? 'processed clickable' : ''}`}
              onClick={handleImageClick}
              title={processedImage ? 'Click to download' : ''}
            />
            {processedImage && (
              <p className="download-hint">Click image to download</p>
            )}
          </div>
        )}
      </div>
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
    </div>
  )
}

function App() {
  return <ImageProcessor />
}

export default App
