/**
 * Application-wide constants for file-spooder.
 * Single source of truth for all configuration values.
 */

// Maximum file upload size (5 GB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;

// Storage visualization max (10 GB)
export const MAX_STORAGE_DISPLAY = 10 * 1024 * 1024 * 1024;

// File extension categories for icon display
export const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
export const VIDEO_EXTS = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
export const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
export const DOC_EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'];
export const ARCHIVE_EXTS = ['zip', 'rar', '7z', 'tar', 'gz'];
export const CODE_EXTS = ['js', 'ts', 'py', 'html', 'css', 'json', 'xml', 'yaml', 'yml'];

// Regex to convert GitHub blob URLs to raw URLs
export const GITHUB_BLOB_REGEX = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/(.+)$/;

// Cache TTL for served files (1 hour)
export const FILE_CACHE_MAX_AGE = 3600;

// Folder sentinel filename
export const FOLDER_SENTINEL = '.folder';

// Link file extension
export const LINK_EXTENSION = '.link';
