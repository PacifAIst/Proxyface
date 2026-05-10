/**
 * Placeholder pixel-art face used until step 4 ships the real
 * sprite-driven ProxyFaceEngine.
 *
 * Implemented as an inline SVG composed of 1×1 "pixels" so it scales
 * crisply at any size and proves the rendering pipeline works in all
 * three targets without any asset loading or canvas plumbing.
 *
 * Each <rect> is one pixel of a 16-wide art board. Adjusting `size`
 * scales the whole face uniformly.
 */
export function PlaceholderFace({ size = 192 }: { size?: number }) {
  // 16x16 grid. Coordinates are (x, y) in grid units.
  // F = face base, E = eye, M = mouth, S = shadow
  const facePixels: Array<[number, number]> = [];
  // Round-ish face: rows 2..13, cols 3..12 with corners trimmed
  for (let y = 2; y <= 13; y++) {
    for (let x = 3; x <= 12; x++) {
      const inCorner =
        (y === 2 && (x <= 4 || x >= 11)) ||
        (y === 13 && (x <= 4 || x >= 11)) ||
        (y === 3 && (x === 3 || x === 12));
      if (!inCorner) facePixels.push([x, y]);
    }
  }

  // Eyes (idle, looking forward)
  const eyes: Array<[number, number]> = [
    [6, 7],
    [9, 7],
  ];

  // Subtle smile
  const mouth: Array<[number, number]> = [
    [6, 10],
    [7, 11],
    [8, 11],
    [9, 10],
  ];

  // Bottom shadow row to give it weight
  const shadow: Array<[number, number]> = [
    [4, 13],
    [5, 13],
    [6, 13],
    [7, 13],
    [8, 13],
    [9, 13],
    [10, 13],
    [11, 13],
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className="animate-breathe"
      role="img"
      aria-label="ProxyFace placeholder avatar"
    >
      {/* Face base */}
      {facePixels.map(([x, y]) => (
        <rect key={`f-${x}-${y}`} x={x} y={y} width={1} height={1} fill="#f5b942" />
      ))}
      {/* Shadow row */}
      {shadow.map(([x, y]) => (
        <rect key={`s-${x}-${y}`} x={x} y={y} width={1} height={1} fill="#8a661f" />
      ))}
      {/* Eyes (with blink animation applied to a wrapping group) */}
      <g className="origin-center animate-blink" style={{ transformBox: 'fill-box' }}>
        {eyes.map(([x, y]) => (
          <rect key={`e-${x}-${y}`} x={x} y={y} width={1} height={1} fill="#06070d" />
        ))}
      </g>
      {/* Mouth */}
      {mouth.map(([x, y]) => (
        <rect key={`m-${x}-${y}`} x={x} y={y} width={1} height={1} fill="#06070d" />
      ))}
    </svg>
  );
}
