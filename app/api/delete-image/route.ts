import { NextRequest, NextResponse } from 'next/server';
import { deleteImage } from '@/lib/cloudinary';

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json(
                { error: 'No URL provided' },
                { status: 400 }
            );
        }

        try {
            const deleteResult = await deleteImage(url);

            if (deleteResult.result === 'ok') {
                return NextResponse.json({
                    success: true,
                    message: 'Image deleted successfully',
                    result: deleteResult.result
                });
            } else if (deleteResult.result === 'not found') {
                return NextResponse.json(
                    { error: 'Image not found' },
                    { status: 404 }
                );
            } else if (deleteResult.result === 'ignored') {
                return NextResponse.json({
                    success: true,
                    message: 'Image ignored (not cloudinary)',
                });
            } else {
                return NextResponse.json(
                    { error: 'Failed to delete image' },
                    { status: 500 }
                );
            }
        } catch (err: any) {
            return NextResponse.json(
                { error: err.message || 'Error deleting image' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Cloudinary delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete image from Cloudinary' },
            { status: 500 }
        );
    }
}