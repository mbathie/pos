import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { spawn } from 'child_process';
import path from 'path';

// Simple auth token - you should generate a secure one and store in .env
const CRON_SECRET = process.env.CRON_SECRET || 'your-secure-cron-secret-here';

export async function POST(request) {
  try {
    // Verify the request is authorized
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const cronSecret = headersList.get('x-cron-secret');

    // Check for authorization
    if (cronSecret !== CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Log the cron execution
    console.log(`[${new Date().toISOString()}] Processing scheduled pauses via API endpoint`);

    // Execute the script
    return new Promise((resolve) => {
      const scriptPath = path.join(process.cwd(), 'scripts', 'process-scheduled-pauses.js');
      const child = spawn('node', [scriptPath], {
        env: process.env,
        cwd: process.cwd()
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
        console.log(data.toString());
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(data.toString());
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(NextResponse.json({
            success: true,
            message: 'Scheduled pauses processed successfully',
            output: output.split('\n').slice(-10).join('\n') // Last 10 lines
          }));
        } else {
          resolve(NextResponse.json(
            {
              success: false,
              error: 'Failed to process scheduled pauses',
              details: errorOutput || output
            },
            { status: 500 }
          ));
        }
      });

      child.on('error', (error) => {
        console.error('Failed to start process:', error);
        resolve(NextResponse.json(
          {
            success: false,
            error: 'Failed to start process',
            details: error.message
          },
          { status: 500 }
        ));
      });
    });

  } catch (error) {
    console.error('Error in cron endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing (remove in production)
export async function GET() {
  return NextResponse.json({
    message: 'Cron endpoint for processing scheduled pauses',
    method: 'POST',
    authentication: 'Required - use X-Cron-Secret header or Bearer token',
    endpoint: '/api/cron/process-pauses'
  });
}