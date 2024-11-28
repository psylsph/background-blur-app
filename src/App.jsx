import { useState } from 'react'
import './App.css'
import axios from 'axios'

function ImageProcessor() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0])
  }

  const processImage = async () => {
    if (!selectedFile) {
      alert('Please select an image first')
      return
    }

    const apiKey = import.meta.env.VITE_REMOVE_BG_API_KEY
    if (!apiKey) {
      alert('API key is missing. Please check your .env file.')
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('image_file', selectedFile)

    try {
      console.log('Making API request with key:', apiKey.substring(0, 5) + '...')
      const response = await axios({
        method: 'post',
        url: 'https://api.remove.bg/v1.0/removebg',
        data: formData,
        responseType: 'arraybuffer',
        headers: {
          'X-Api-Key': apiKey,
        },
      })

      if (!response.data) {
        throw new Error('No data received from the API')
      }

      // Convert array buffer to base64
      const base64String = btoa(
        new Uint8Array(response.data)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      )
      setProcessedImage(`data:image/png;base64,${base64String}`)
    } catch (error) {
      console.error('Full error:', error)
      let errorMessage = 'Error processing image. '
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response:', {
          status: error.response.status,
          data: error.response.data
        })
        if (error.response.status === 402) {
          errorMessage += 'API key quota exceeded or invalid.'
        } else if (error.response.status === 401) {
          errorMessage += 'Invalid API key.'
        } else {
          errorMessage += `Server error: ${error.response.status}`
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request)
        errorMessage += 'No response from server. Please check your internet connection.'
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message)
        errorMessage += error.message
      }
      
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>Image Background Blur</h1>
      <div className="upload-section">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="file-input"
        />
        <button
          onClick={processImage}
          disabled={loading}
          className="process-button"
        >
          {loading ? 'Processing...' : 'Process Image'}
        </button>
      </div>
      
      <div className="images-container">
        {selectedFile && (
          <div className="image-box">
            <h3>Original Image</h3>
            <img
              src={URL.createObjectURL(selectedFile)}
              alt="Original"
              className="preview-image"
            />
          </div>
        )}
        {processedImage && (
          <div className="image-box">
            <h3>Processed Image</h3>
            <img
              src={processedImage}
              alt="Processed"
              className="preview-image processed"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  return <ImageProcessor />
}

export default App
