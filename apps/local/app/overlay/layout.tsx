import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LiveStat Overlay',
};

/**
 * Overlay layout — strips ALL backgrounds so OBS browser sources are transparent.
 * This is a server component, so the style tag renders at HTML level (no hydration flash).
 */
export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html, body {
              background: transparent !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
            }
          `,
        }}
      />
      {children}
    </>
  );
}
