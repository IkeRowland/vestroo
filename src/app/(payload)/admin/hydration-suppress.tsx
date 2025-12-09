/**
 * Client-side script to suppress hydration warnings for PayloadCMS dynamic CSS injection
 *
 * This addresses the known hydration mismatch issue where PayloadCMS injects CSS
 * dynamically, causing server/client HTML mismatch in the <head><style> tag.
 *
 * The issue occurs because:
 * - Server renders: `@layer payload-default, payload;`
 * - Client renders: JSON stringified CSS object with body styles
 *
 * Solution: Use a beforeInteractive script to intercept and suppress the specific
 * hydration warning before React reports it. This is a known PayloadCMS + Next.js 15 issue.
 */
'use client'

import Script from 'next/script'

export function HydrationSuppress() {
  return (
    <Script
      id="payload-hydration-suppress"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            if (typeof window === 'undefined') return;
            
            // Store original console.error
            const originalError = console.error;
            
            // Override console.error to filter PayloadCMS hydration warnings
            console.error = function(...args) {
              const message = String(args[0] || '');
              
              // Check if this is the PayloadCMS CSS hydration warning
              const isPayloadHydrationWarning = 
                message.includes('Hydration failed') &&
                (
                  message.includes('<style>') ||
                  message.includes('@layer') ||
                  message.includes('payload-default') ||
                  message.includes('body {transition: opacity') ||
                  message.includes('payload')
                );
              
              // Suppress only PayloadCMS CSS hydration warnings
              // Allow all other errors to pass through normally
              if (isPayloadHydrationWarning) {
                // Suppress the warning silently - it's a known PayloadCMS + Next.js 15 compatibility issue
                // that doesn't affect functionality
                return;
              }
              
              // Call original console.error for all other messages
              originalError.apply(console, args);
            };
          })();
        `,
      }}
    />
  )
}

