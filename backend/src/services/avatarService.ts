import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { query } from '../db/index.js';
import type { Avatar } from '../db/schema.js';

const AVATAR_DIR = process.env.AVATAR_DIR || './data/avatars';
const SIZES = {
  tiny: 32,
  small: 64,
  large: 256
};

class AvatarService {
  /**
   * Generate 3 avatar sizes from uploaded image and save to disk
   */
  async uploadAvatar(userId: string, imageBuffer: Buffer): Promise<Avatar> {
    // Validate image with Sharp
    const metadata = await sharp(imageBuffer, { limitInputPixels: 16777216 }).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image file');
    }
    if (metadata.width > 4096 || metadata.height > 4096) {
      throw new Error('Image dimensions too large (max 4096x4096)');
    }

    // Create user avatar directory
    const userDir = path.join(AVATAR_DIR, userId);
    await fs.mkdir(userDir, { recursive: true });

    // Generate 3 sizes in parallel as WebP
    const [tinyPath, smallPath, largePath] = await Promise.all([
      this.resizeAndSave(imageBuffer, userDir, 'tiny', SIZES.tiny),
      this.resizeAndSave(imageBuffer, userDir, 'small', SIZES.small),
      this.resizeAndSave(imageBuffer, userDir, 'large', SIZES.large),
    ]);

    // Upsert avatar record in database
    const result = await query(
      `INSERT INTO avatars (user_id, tiny_path, small_path, large_path, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET tiny_path = $2, small_path = $3, large_path = $4, updated_at = NOW()
       RETURNING *`,
      [userId, tinyPath, smallPath, largePath]
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Resize image to square and save as WebP
   */
  private async resizeAndSave(
    buffer: Buffer,
    dir: string,
    sizeName: string,
    size: number
  ): Promise<string> {
    const filename = `${sizeName}.webp`;
    const filepath = path.join(dir, filename);

    await sharp(buffer)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .webp({ quality: sizeName === 'large' ? 90 : 85 })
      .toFile(filepath);

    return filepath;
  }

  /**
   * Get avatar record for user (null if no avatar)
   */
  async getAvatar(userId: string): Promise<Avatar | null> {
    const result = await query(
      `SELECT * FROM avatars WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Delete avatar (files and database record)
   */
  async deleteAvatar(userId: string): Promise<void> {
    // Delete files
    const userDir = path.join(AVATAR_DIR, userId);
    await fs.rm(userDir, { recursive: true, force: true });

    // Delete database record
    await query(`DELETE FROM avatars WHERE user_id = $1`, [userId]);
  }

  /**
   * Get avatar URL for user and size with cache-busting version
   */
  getAvatarUrl(userId: string, size: 'tiny' | 'small' | 'large', version?: number): string {
    const base = `/api/avatars/${userId}/${size}`;
    return version ? `${base}?v=${version}` : base;
  }

  /**
   * Get avatar file path for serving
   */
  async getAvatarPath(userId: string, size: 'tiny' | 'small' | 'large'): Promise<string | null> {
    const avatar = await this.getAvatar(userId);
    if (!avatar) return null;

    switch (size) {
      case 'tiny': return avatar.tiny_path;
      case 'small': return avatar.small_path;
      case 'large': return avatar.large_path;
    }
  }

  private mapRow(row: any): Avatar {
    return {
      id: row.id,
      user_id: row.user_id,
      tiny_path: row.tiny_path,
      small_path: row.small_path,
      large_path: row.large_path,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export const avatarService = new AvatarService();
