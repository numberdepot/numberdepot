'use client';

import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * Ellie the mascot with a comic-style speech bubble.
 *
 * Built to the conventions comic letterers actually use (Blambot's "Comic Book
 * Grammar", Multic's balloon guide):
 *   - the balloon is an OVAL, not a rounded box;
 *   - the tail leaves from the balloon's lower third, never its centre;
 *   - the tail is short — about half the way to the speaker — and simply aims
 *     at the mouth, as if an invisible line carried on to it;
 *   - it curves slightly and tapers to a point.
 *
 * The oval and tail are ONE SVG path inside the bubble element, so the fill and
 * the outline are continuous with no join to hide, and the whole thing scales
 * with the text at every breakpoint. The path lives in a 100x60 box that the
 * ellipse fills; the tail pokes out past the left edge (overflow: visible).
 *
 * Client rules: sits to the RIGHT of Ellie at mouth height, red, never covering
 * any part of her.
 */
export default function MascotWithBubble({
  src = '/images/elephant-01.png',
  alt = 'NumberDepot elephant mascot',
  href = '/suggestions?from=hero-bubble',
  line1 = 'Any suggestions?',
  line2 = 'Click here',
}: {
  src?: string;
  alt?: string;
  href?: string;
  line1?: string;
  line2?: string;
}) {
  const RED = '#E53935';
  const IMAGE_SHARE = { xs: '64%', md: '62%', lg: '66%' };

  // Ellipse cx=50 cy=30 rx=50 ry=30. Tail base is two points on the ellipse's
  // lower-left, ~18 units apart (a real wedge, so the red shows inside the
  // outline); the arc runs the long way round between them. Tip is ~45 units
  // out to the left — about half way to the mouth — and aims at it.
  const BALLOON =
    'M 3 38 ' + // base top (on the ellipse's lower-left)
    'A 50 30 0 1 1 15 51 ' + // the long way round, over the top, to base bottom
    'Q -10 54 -40 48 ' + // lower edge out to the tip
    'Q -12 40 3 38 Z'; // upper edge back — slight upward bow

  return (
    <Box
      className="animate-float"
      sx={{
        position: 'relative',
        display: 'block',
        maxWidth: { xs: 380, sm: 460, md: 560, lg: 640 },
        width: '100%',
      }}
    >
      <Box
        component="img"
        src={src}
        alt={alt}
        sx={{
          display: 'block',
          width: IMAGE_SHARE,
          height: 'auto',
          filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.35))',
        }}
      />

      {/* Balloon — positioned in the clear space right of Ellie, at mouth height. */}
      <Box
        component={Link}
        href={href}
        aria-label={`${line1} ${line2}`}
        sx={{
          position: 'absolute',
          right: 0,
          top: '35%',
          transform: 'translateY(-50%)',
          zIndex: 2,
          display: 'inline-block',
          textDecoration: 'none',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          color: '#fff',
          // Generous horizontal padding: an ellipse clips its corners, so the
          // text needs more room than a box would.
          px: { xs: 2.4, md: 2.8, lg: 3.4 },
          py: { xs: 1.3, md: 1.5, lg: 1.9 },
          filter: 'drop-shadow(0 10px 22px rgba(229,57,53,0.45))',
          transition: 'filter 0.2s ease, transform 0.2s ease',
          '&:hover': {
            filter: 'drop-shadow(0 16px 32px rgba(229,57,53,0.6))',
            transform: 'translateY(-50%) scale(1.04)',
          },
          '&:focus-visible': { outline: '3px solid #fff', outlineOffset: 4, borderRadius: '50%' },
        }}
      >
        {/* The balloon shape itself, stretched to the text's box. */}
        <Box
          component="svg"
          viewBox="0 0 100 60"
          preserveAspectRatio="none"
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
            zIndex: -1,
          }}
        >
          <path
            d={BALLOON}
            fill={RED}
            stroke="#fff"
            strokeWidth="3"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </Box>

        <Typography
          component="span"
          sx={{
            display: 'block',
            fontWeight: 900,
            lineHeight: 1.15,
            fontSize: { xs: '0.8rem', sm: '0.95rem', md: '0.95rem', lg: '1.15rem' },
            letterSpacing: 0.2,
          }}
        >
          {line1}
        </Typography>
        <Typography
          component="span"
          sx={{
            display: 'block',
            fontWeight: 700,
            lineHeight: 1.15,
            fontSize: { xs: '0.7rem', sm: '0.82rem', md: '0.82rem', lg: '0.95rem' },
            opacity: 0.95,
            mt: 0.25,
            '&::after': { content: '" →"' },
          }}
        >
          {line2}
        </Typography>
      </Box>
    </Box>
  );
}
