import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import contentApi from '../services/api.service';
import './AddContent.css';

type ContentType = 'text' | 'url' | 'image' | 'video';

const AddContent = () => {
  const navigate = useNavigate();
  const [contentType, setContentType] = useState<ContentType>('text');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (contentType === 'image' && imageFile) {
        // Upload image
        await contentApi.uploadImage(imageFile, title, description, content);
      } else if (contentType === 'video' && videoFile) {
        // Upload video
        await contentApi.uploadVideo(videoFile, title, description, content);
      } else if (contentType === 'url') {
        // Create URL content
        if (!url.trim()) {
          throw new Error('URL is required');
        }
        await contentApi.createContent({
          title: title || undefined,
          description: description || undefined,
          content: content || undefined,
          url: url,
        });
      } else {
        // Create text content
        if (!content.trim()) {
          throw new Error('Content is required');
        }
        await contentApi.createContent({
          title: title || undefined,
          description: description || undefined,
          content: content,
        });
      }

      setSuccess(true);
      // Reset form
      setTitle('');
      setDescription('');
      setContent('');
      setUrl('');
      setImageFile(null);
      setImagePreview(null);
      setVideoFile(null);
      setVideoPreview(null);

      // Redirect to home after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('Error creating content:', err);
      setError(err instanceof Error ? err.message : 'Failed to create content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-content-page">
      <div className="add-content-container">
        <div className="page-header">
          <h1>Add New Content</h1>
          <p>Save URLs, text notes, or images to your knowledge base</p>
        </div>

        <div className="content-type-selector">
          <button
            type="button"
            className={`type-btn ${contentType === 'text' ? 'active' : ''}`}
            onClick={() => setContentType('text')}
          >
            <span className="type-icon">📝</span>
            Text
          </button>
          <button
            type="button"
            className={`type-btn ${contentType === 'url' ? 'active' : ''}`}
            onClick={() => setContentType('url')}
          >
            <span className="type-icon">🔗</span>
            URL
          </button>
          <button
            type="button"
            className={`type-btn ${contentType === 'image' ? 'active' : ''}`}
            onClick={() => setContentType('image')}
          >
            <span className="type-icon">🖼️</span>
            Image
          </button>
          <button
            type="button"
            className={`type-btn ${contentType === 'video' ? 'active' : ''}`}
            onClick={() => setContentType('video')}
          >
            <span className="type-icon">🎥</span>
            Video
          </button>
        </div>

        {success && (
          <div className="success-message">
            <span className="success-icon">✓</span>
            Content created successfully! Redirecting...
          </div>
        )}

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="add-content-form">
          <div className="form-group">
            <label htmlFor="title">Title (Optional)</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your content"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description"
              className="form-textarea"
              rows={3}
            />
          </div>

          {contentType === 'url' && (
            <div className="form-group">
              <label htmlFor="url">
                URL <span className="required">*</span>
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="form-input"
                required
              />
            </div>
          )}

          {contentType === 'text' && (
            <div className="form-group">
              <label htmlFor="content">
                Content <span className="required">*</span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your content here..."
                className="form-textarea"
                rows={10}
                required
              />
            </div>
          )}

          {contentType === 'image' && (
            <div className="form-group">
              <label htmlFor="image">
                Image <span className="required">*</span>
              </label>
              <div className="image-upload-container">
                <input
                  type="file"
                  id="image"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className="file-input"
                  required
                />
                {imagePreview && (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" />
                  </div>
                )}
              </div>
              <small className="form-hint">
                Accepted formats: JPEG, PNG, GIF, WebP (max 10MB)
              </small>
            </div>
          )}

          {contentType === 'video' && (
            <div className="form-group">
              <label htmlFor="video">
                Video <span className="required">*</span>
              </label>
              <div className="video-upload-container">
                <input
                  type="file"
                  id="video"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime"
                  onChange={handleVideoChange}
                  className="file-input"
                  required
                />
                {videoPreview && (
                  <div className="video-preview">
                    <video src={videoPreview} controls />
                  </div>
                )}
              </div>
              <small className="form-hint">
                Accepted formats: MP4, WebM, OGG, MOV (max 100MB)
              </small>
            </div>
          )}

          {(contentType === 'url' || contentType === 'image' || contentType === 'video') && (
            <div className="form-group">
              <label htmlFor="additional-content">Additional Notes (Optional)</label>
              <textarea
                id="additional-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add any additional notes about this content..."
                className="form-textarea"
                rows={4}
              />
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Content'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContent;
