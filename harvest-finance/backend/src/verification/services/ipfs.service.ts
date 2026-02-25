import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface IpfsUploadResult {
  hash: string;
  size: string;
}

@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);
  private readonly ipfsHost: string;
  private readonly ipfsPort: number;
  private readonly ipfsProtocol: string;

  constructor(private readonly configService: ConfigService) {
    this.ipfsHost = this.configService.get<string>('IPFS_HOST', 'localhost');
    this.ipfsPort = this.configService.get<number>('IPFS_PORT', 5001);
    this.ipfsProtocol = this.configService.get<string>('IPFS_PROTOCOL', 'http');
  }

  private get ipfsUrl(): string {
    return `${this.ipfsProtocol}://${this.ipfsHost}:${this.ipfsPort}`;
  }

  /**
   * Upload a file to IPFS
   * @param file Buffer of the file to upload
   * @param filename Original filename
   */
  async uploadFile(file: Buffer, filename: string): Promise<IpfsUploadResult> {
    try {
      const formData = new FormData();
      // Convert buffer to Uint8Array for Blob compatibility
      const uint8Array = new Uint8Array(file);
      const blob = new Blob([uint8Array]);
      formData.append('file', blob, filename);

      const response = await axios.post(`${this.ipfsUrl}/api/v0/add`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      if (response.data && response.data.Hash) {
        this.logger.log(`File uploaded to IPFS with hash: ${response.data.Hash}`);
        return {
          hash: response.data.Hash,
          size: response.data.Size,
        };
      }

      throw new HttpException(
        'Invalid response from IPFS',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } catch (error) {
      this.logger.error(`Failed to upload to IPFS: ${error.message}`);

      // If IPFS is not available, return a mock hash for development
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn('Using mock IPFS hash for development');
        return {
          hash: `mock_${Date.now()}_${filename.replace(/\s/g, '_')}`,
          size: file.length.toString(),
        };
      }

      throw new HttpException(
        `IPFS upload failed: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Get a file from IPFS
   * @param hash IPFS content hash
   */
  async getFile(hash: string): Promise<Buffer> {
    try {
      const response = await axios.post(
        `${this.ipfsUrl}/api/v0/cat?arg=${hash}`,
        {},
        {
          responseType: 'arraybuffer',
          timeout: 30000,
        },
      );

      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Failed to get file from IPFS: ${error.message}`);

      // For development, return a placeholder
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn('Using mock file for development');
        return Buffer.from('Mock file content');
      }

      throw new HttpException(
        `IPFS retrieval failed: ${error.message}`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Get IPFS gateway URL for a hash
   * @param hash IPFS content hash
   */
  getGatewayUrl(hash: string): string {
    const gatewayHost = this.configService.get<string>('IPFS_GATEWAY_HOST', 'ipfs.io');
    return `https://${gatewayHost}/ipfs/${hash}`;
  }

  /**
   * Check IPFS connection status
   */
  async checkConnection(): Promise<boolean> {
    try {
      await axios.post(`${this.ipfsUrl}/api/v0/version`, {}, { timeout: 5000 });
      return true;
    } catch (error) {
      this.logger.warn(`IPFS connection check failed: ${error.message}`);
      return false;
    }
  }
}
