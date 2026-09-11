import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import * as path from 'path';

@Injectable()
export class CloudinaryService {
  
  uploadFile(
    file: Express.Multer.File, 
    folderName: string, 
    resourceType: 'image' | 'raw' | 'video' | 'auto' = 'auto'
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    const environment = process.env.NODE_ENV === 'production' ? 'production' : 'testing';
    
    // Para archivos tipo raw (PowerPoint, PDF, ZIP, etc.), Cloudinary requiere que
    // la extensión forme parte del public_id para mantener su formato y tipo MIME.
    const ext = path.extname(file.originalname || '');
    const cleanBaseName = path.basename(file.originalname || 'archivo', ext)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .substring(0, 80);

    const options: any = { 
      folder: `instituto/${environment}/${folderName}`,
      resource_type: resourceType 
    };

    if (resourceType === 'raw' && ext) {
      options.public_id = `${cleanBaseName}_${Date.now()}${ext}`;
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string, resourceType: 'image' | 'raw' | 'video' = 'image'): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (_) {
      if (resourceType === 'image') {
        try {
          await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
        } catch (__) {}
      }
    }
  }
}
