import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  
  uploadFile(file: Express.Multer.File, folderName: string, resourceType: 'image' | 'raw' | 'video' | 'auto' = 'auto'): Promise<UploadApiResponse | UploadApiErrorResponse> {
    const environment = process.env.NODE_ENV === 'production' ? 'production' : 'testing';
    
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: `instituto/${environment}/${folderName}`,
          resource_type: resourceType 
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
