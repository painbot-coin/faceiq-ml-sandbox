import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Try to load from sample-faces.json first, then fall back to approved-faces
    const dataDir = path.join(process.cwd(), 'data');
    
    let filePath = path.join(dataDir, 'sample-faces.json');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // Try alternate filename
      filePath = path.join(dataDir, 'approved-faces (1).json');
    }
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'No face data file found in data/ directory' },
        { status: 404 }
      );
    }
    
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    const faces = JSON.parse(fileContents);
    
    return NextResponse.json(faces);
  } catch (error) {
    console.error('Error loading faces:', error);
    return NextResponse.json(
      { error: 'Failed to load face data' },
      { status: 500 }
    );
  }
}
