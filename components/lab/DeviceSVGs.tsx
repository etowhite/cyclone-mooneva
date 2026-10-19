// Device drawings with a fill level.
// Changes: no theme object (the caller passes fillColor), useId for unique ids, react-i18next for labels.
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

export function CupSVG({ percent = 60, fillColor, showPercentage = false }: { percent?: number; fillColor?: string; showPercentage?: boolean }) {
  const { t } = useTranslation();
  // Keep original percentage calculation behavior
  const fillHeight = Math.max(0, Math.min(100, percent || 0));
  
  // Paths from the user's SVG
  const outerPath = "m331.59 198.24c130.19-0.0174 169.56 14.721 143.08 53.562-17.576 25.783-18.864 31.076-20.43 83.881-2.6811 90.457-34.352 164.33-83.517 194.81-13.094 8.1176-14.854 10.961-16.637 26.86-0.82004 7.3127-0.63045 8.1562 2.677 11.896 4.2569 4.8139 3.807 9.8307-1.3385 14.941-4.4375 4.4073-4.4172 10.9 0.0467 14.929 4.9019 4.4244 4.5929 11.89-0.68607 16.582-2.2924 2.0376-3.9766 4.8216-3.9766 6.5752 0 1.7334 1.7106 4.6029 3.9766 6.6688 5.1936 4.7347 5.4557 11.376 0.66279 16.796-2.5233 2.8535-3.3204 5.2104-3.3449 9.8738-0.0748 14.167-4.5718 23.033-13.755 27.128-16.952 7.5588-32.091-3.4213-33.6-24.369-0.60644-8.4189-1.2621-10.649-3.8472-13.108-4.2415-4.0361-4.1575-10.534 0.19927-15.461 2.1258-2.404 3.3139-5.2991 3.3139-8.0755 0-2.9857-1.0278-5.246-3.3139-7.2896-2.3614-2.1109-3.3139-4.2862-3.3139-7.5679s0.95254-5.4571 3.3139-7.568c2.4531-2.1929 3.3139-4.2613 3.3139-7.9596 0-3.709-0.85373-5.7483-3.3139-7.9178-4.3306-3.819-4.5655-11.379-0.48413-15.547 2.5228-2.5768 2.7368-3.8224 1.9857-11.512-1.4315-14.657-3.178-17.339-16.911-25.978-46.667-29.356-79.296-101.5-82.073-181.46-2.2582-65.028-3.753-71.601-22.407-98.524-26.208-37.824 15.075-52.145 150.38-52.163z";
  const innerVesselPath = "m184.25 242.72h-2e-3c-5.6e-4 5e-5 -2e-3 3e-5 -5e-3 0h-2e-3 -2e-3l-2e-3 2e-3h-2e-3l-4e-3 4e-3v6e-3c-0.0885 0.27812 2.0534 3.6045 4.9242 7.6271 16.733 23.447 21.119 42.567 21.144 92.183 0.0248 48.551 6.8847 78.26 27.192 117.75 23.316 45.345 44.548 67.405 62.342 64.769 5.5583-0.82342 19.108-1.0892 34.387-0.67253 13.867 0.37819 26.707 1.0501 28.533 1.4929 11.318 2.7449 43.034-35.286 60.212-72.201 17.788-38.225 22.827-63.313 24.58-122.39 1.403-47.286 4.4113-59.351 20.391-81.728 4.2746-5.9859 4.405-5.9071-4.8957-2.9193-57.555 18.489-217 17.95-269.79-0.91151-4.6434-1.6592-8.6918-3.0154-8.9967-3.0154z";
  const rimPath = "m322.14 207.21c-61.525 0.50746-121.21 6.8977-135.97 18.812-9.8433 7.9457 31.327 18.395 89.022 22.595 96.631 7.0347 223.73-9.3027 193.96-24.931-22.118-11.61-85.484-16.984-147.01-16.476z";

  // Use original percentage-to-position mapping logic, adapted to new viewBox
  // Original: fillY = 75 - (fillHeight * 0.55) in 120x120 viewBox
  // This means: 0% = Y=75, 100% = Y=20 (fills from bottom to top)
  // Adapt to new viewBox (0 0 614 1024): scale proportionally
  // Original range: 75 to 20 = 55 units in a 120-height viewBox
  // New viewBox height is 1024, so scale: (55/120) * 1024 ≈ 469
  // Original start: 75 in 120 = 62.5% from top, so in 1024: 1024 * 0.625 ≈ 640
  // Original end: 20 in 120 = 16.67% from top, so in 1024: 1024 * 0.167 ≈ 171
  const viewBoxHeight = 1024;
  const originalStartY = 75; // in 120-height viewBox
  const originalEndY = 20; // in 120-height viewBox
  const originalHeight = 120;
  
  // Scale to new viewBox
  const scaledStartY = (originalStartY / originalHeight) * viewBoxHeight;
  const scaledEndY = (originalEndY / originalHeight) * viewBoxHeight;
  const scaledRange = scaledStartY - scaledEndY;
  
  // Calculate currentY using same logic: startY - (fillHeight * range)
  const currentY = scaledStartY - ((fillHeight / 100) * scaledRange);
  
  const curveIntensity = 12; 
  const curvedLiquidPath = `
    M 0 ${currentY}
    Q 325 ${currentY + curveIntensity} 650 ${currentY}
    V 800
    H 0
    Z
  `;

  const strokeColor = "#5b7a82"; // Brand teal color for cohesive look
  const strokeOpacity = 0.9; // Good visibility
  
  // Use dynamic fillColor if provided, otherwise use theme colors
  const primaryColor = fillColor || '#f1d2c7';
  const secondaryColor = fillColor || '#ebc2b4';
  const uniqueId = useId().replace(/:/g, '');

  // Calculate overflow puddle size (appears when > 100%)
  const overflowAmount = Math.max(0, (percent || 0) - 100);
  const puddleRadiusX = overflowAmount > 0 ? 60 + (overflowAmount / 50) * 180 : 0; // grows from 60 to 240
  const puddleRadiusY = overflowAmount > 0 ? 25 + (overflowAmount / 50) * 60 : 0; // grows from 25 to 85

  return (
    <svg 
      width="120" 
      height="120" 
      viewBox="0 0 614 1150" 
      style={{ overflow: 'hidden' }}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={t('lab.devices.iconCup')}
    >
        <defs>
          <linearGradient id={`liquidGradient-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
          
          <radialGradient id={`cupPuddleGradient-${uniqueId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.9" />
            <stop offset="70%" stopColor={secondaryColor} stopOpacity="0.7" />
            <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.4" />
          </radialGradient>
          
          <clipPath id={`innerVesselClip-${uniqueId}`}>
            <path d={innerVesselPath} />
          </clipPath>

          {/* Elegant layered shadow effect */}
          <filter id={`softShadow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur1" />
            <feOffset dx="0" dy="2" result="offsetblur1" />
            <feComponentTransfer result="shadow1">
              <feFuncA type="linear" slope="0.08" />
            </feComponentTransfer>
            <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="blur2" />
            <feOffset dx="0" dy="6" result="offsetblur2" />
            <feComponentTransfer result="shadow2">
              <feFuncA type="linear" slope="0.06" />
            </feComponentTransfer>
            <feGaussianBlur in="SourceAlpha" stdDeviation="16" result="blur3" />
            <feOffset dx="0" dy="12" result="offsetblur3" />
            <feComponentTransfer result="shadow3">
              <feFuncA type="linear" slope="0.04" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="shadow3" />
              <feMergeNode in="shadow2" />
              <feMergeNode in="shadow1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Inner glow for depth */}
          <filter id={`innerGlow-${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
            <feComponentTransfer result="glow">
              <feFuncA type="linear" slope="0.15" />
            </feComponentTransfer>
            <feComposite in="glow" in2="SourceAlpha" operator="in" />
          </filter>
        </defs>

        {/* Overflow puddle - appears below cup when overfull */}
        {overflowAmount > 0 && (
          <ellipse
            cx="307"
            cy="1080"
            rx={puddleRadiusX}
            ry={puddleRadiusY}
            fill={`url(#cupPuddleGradient-${uniqueId})`}
            className="transition-all duration-500 ease-in-out"
          />
        )}

        <g transform="matrix(-1.8333 0 0 1.9751 911.96 -367.69)" filter={`url(#softShadow-${uniqueId})`}>
          {/* 1. Liquid Fill */}
          {fillHeight > 0 && (
            <path 
              d={curvedLiquidPath}
              fill={`url(#liquidGradient-${uniqueId})`}
              clipPath={`url(#innerVesselClip-${uniqueId})`}
              className="transition-all duration-700 ease-in-out"
            />
          )}

          {/* 2. Outer Silhouette Outline - clean and visible */}
          <path 
            d={outerPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ strokeOpacity }}
          />

          {/* 3. Inner Vessel Outline */}
          <path 
            d={innerVesselPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ strokeOpacity: strokeOpacity * 0.85 }}
          />

          {/* 4. Top Rim Overlay */}
          <path 
            d={rimPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ strokeOpacity }}
          />
        </g>
        
        {/* Percentage Text */}
        {showPercentage && (
          <text
            x="307"
            y="575"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="140"
            fontWeight="800"
            fill="#2a455b"
            style={{ opacity: 0.95, letterSpacing: '-0.02em' }}
          >
            {Math.round(percent || 0)}%
          </text>
        )}
      </svg>
  );
}

export function DiscSVG({ percent = 60, fillColor, showPercentage = false }: { percent?: number; fillColor?: string; showPercentage?: boolean }) {
  const { t } = useTranslation();
  const clampedFullness = Math.max(0, Math.min(150, percent || 0));
  
  // Disc paths - ONLY the disc shape (not the cup paths from nested g)
  const discOuterPath = "m374.04 416.09c7.3357-0.77286 14.528-2.7127 22.067-5.9521 14.351-6.1659 25.86-15.206 36.992-29.056 8.5358-10.62 17.317-31.101 23.848-55.62 0.12184-0.45729 0.65773-2.823 1.191-5.2571 1.3449-6.1386 1.9068-9.7916 2.571-16.716 0.35048-3.6532 0.67188-11.395 0.77405-18.645 0.12337-8.7498 0.12528-8.7565 4.0768-14.492 3.6208-5.2553 5.4734-6.741 10.391-8.3328 10.211-3.3053 14.117-11.36 9.7692-20.149-0.84571-1.7096-0.84571-1.7096 1.2024-3.6578 8.3825-7.9733 6.702-20.432-3.6296-26.908-4.2781-2.6817-10.422-4.3012-29.076-7.6645-13.881-2.5027-21.502-3.3667-44.258-5.017-5.3943-0.39121-11.187-0.82211-12.873-0.95754-2.7846-0.22372-11.565-0.75072-17.777-1.0669-14.583-0.74234-26.716-1.2311-39.108-1.5754-5.4617-0.15175-12.358-0.34926-15.325-0.43891-7.2922-0.22036-50.742-0.21614-58.234 5e-3 -15.136 0.44809-33.725 1.5957-44.38 2.7399-23.385 2.5111-32.138 4.1305-41.193 7.6209-6.8538 2.642-7.5044 3.0748-9.9352 6.6092-5.1079 7.427-4.4475 14.722 1.9183 21.188 1.4489 1.4718 1.4489 1.4718 0.91934 2.1924-5.5414 7.5394-2.051 18.018 7.5261 22.594 1.882 0.8992 1.855 0.85012 2.9049 5.2825 2.7514 11.615 6.4768 21.915 11.06 30.576 1.9904 3.7619 9.513 15.872 10.559 16.997 0.12785 0.13755 0.55002 0.72547 0.93827 1.3065 0.67741 1.0138 1.4998 2.1272 4.64 6.2822 9.3594 12.384 21.9 23.973 36.408 33.645 14.711 9.8079 38.679 19.499 54.524 22.047 9.0441 1.4539 28.063 1.6887 38.037 0.46949 18.088-2.211 39.291-10.91 56.395-23.138 4.1275-2.9507 10.474-7.5723 10.741-7.8224 0.16078-0.15013 1.8922-1.5647 3.8476-3.1434 1.9554-1.5787 3.8864-3.1585 4.2909-3.5105 1.4992-1.3045 3.0649-2.5541 3.0649-2.4461 0 0.80588-7.4866 13.443-10.867 18.342-7.3302 10.625-21.34 24.286-32.09 31.289-11.452 7.4604-18.856 14.607-19.827 19.137-1.9989 9.3285 5.118 14.589 17.913 13.241z";
  const discInnerPath = "m313.9 372.24c-21.37-1.0821-45.686-10.251-69.235-26.108-9.2472-6.2264-21.371-17.69-28.891-27.317-0.66335-0.84918-1.2695-1.5974-1.347-1.6628-1.043-0.87911-10.628-14.722-13.404-19.36-2.9428-4.9153-6.315-11.786-8.0798-16.461-0.47846-1.2676-1.0687-2.7857-1.3116-3.3737-0.46439-1.124-1.493-4.189-2.5612-7.6324-0.34981-1.1276-1.2345-4.352-1.966-7.1654-1.6385-6.3017-1.8737-6.7321-4.1893-7.6626-8.114-3.2606-11.128-11.623-6.8556-19.024 1.2718-2.2032 1.187-2.7234-0.80675-4.9499-3.417-3.8161-4.4474-5.9026-4.6617-9.44-0.64658-10.676 9.3737-16.79 32.428-19.787 10.014-1.3013 17.08-2.1162 22.682-2.6154 6.287-0.56033 23.924-1.7284 34.695-2.2977 9.1492-0.48362 62.181-0.40671 75.765 0.1099 6.0686 0.23079 15.447 0.58106 20.841 0.77836 5.3943 0.1973 10.084 0.4031 10.421 0.45734 0.33714 0.0542 2.3232 0.16264 4.4135 0.24087 6.35 0.23763 15.115 0.6779 19.125 0.96069 0.87654 0.0618 4.297 0.27518 7.601 0.47417 5.184 0.3122 12.177 0.82672 24.152 1.7769 1.6183 0.1284 3.3837 0.28823 3.9231 0.35513s3.9599 0.44474 7.601 0.83964c16.938 1.837 39.957 6.2663 45.156 8.6891 11.136 5.1891 13.393 16.78 4.9498 25.426-1.851 1.8956-2.1555 2.5783-1.593 3.5718 1.3764 2.431 2.2076 7.4443 1.6315 9.8403-1.0786 4.4865-3.5233 6.7776-9.107 8.5347-6.1737 1.9429-9.855 5.4866-15.042 14.48-0.56513 0.97984-1.634 2.7971-2.3753 4.0382-0.74129 1.2412-1.9413 3.3791-2.6666 4.7509-1.343 2.5397-6.251 10.992-8.2694 14.242-0.95829 1.5427-4.6862 6.9516-7.6699 11.128-1.7826 2.4954-3.9454 5.0725-8.1995 9.7701-7.8673 8.6874-18.344 18.217-28.569 25.984-0.203 0.15422-1.0857 0.82597-1.9615 1.4928-26.58 20.235-53.477 28.593-86.623 26.914z";
  const discRim1Path = "m479.72 239.41c0-0.85637-6.0146-2.1061-18.022-3.7446-22.693-3.0967-41.344-4.6636-71.964-6.0458-1.5508-0.07-4.9713-0.22858-7.601-0.35234-2.6297-0.12385-6.6019-0.28869-8.827-0.36642-2.2251-0.0778-5.0939-0.18481-6.375-0.23783-21.829-0.9037-84.849-0.90211-105.07 5e-3 -1.3486 0.0604-4.769 0.16928-7.601 0.2421-2.832 0.0727-5.7559 0.17954-6.4976 0.23725-0.74169 0.0577-2.8933 0.16318-4.7813 0.23435-11.161 0.42061-29.206 1.31-33.714 1.6618-0.7417 0.0579-2.2864 0.16776-3.4327 0.24425-3.0727 0.20492-12.398 1.0276-16.06 1.4167-7.9874 0.84877-8.7066 0.94757-8.6208 1.1844 0.0488 0.13474 0.35336 0.22576 0.67683 0.20225 4.0981-0.29801 9.9341-0.6162 16.771-0.91431 4.5851-0.19991 9.2193-0.41137 10.298-0.46991 4.1449-0.22487 7.0165-0.34817 11.156-0.47897 2.36-0.0746 4.6219-0.17993 5.0265-0.23412 0.73027-0.0978 1.6753-0.14098 12.995-0.59382 3.2365-0.12945 7.2087-0.29229 8.827-0.36187 23.137-0.99453 105.08-1.3266 114.87-0.4655 0.60685 0.0533 3.9722 0.15684 7.4784 0.22998 3.5063 0.0731 7.2578 0.18466 8.3366 0.24782 1.0788 0.0631 4.3338 0.22168 7.2332 0.35228 2.8994 0.13063 6.1544 0.29145 7.2332 0.35741 7.5063 0.45881 9.6954 0.58158 12.627 0.70845 1.8206 0.0787 4.7997 0.24125 6.6202 0.36106 1.8205 0.1198 4.4687 0.27973 5.8846 0.35535 9.0503 0.4832 28.762 2.4084 38.863 3.7956 0.40457 0.0557 2.7217 0.32527 5.1491 0.59931s6.6202 0.82916 9.3174 1.2335c6.0325 0.90445 9.1948 1.1104 9.1948 0.59889z";
  const discRim2Path = "m457.89 262.84c-0.0185-0.98089-3.5163-1.431-20.838-2.6812-5.4617-0.39423-11.365-0.82521-13.118-0.95771-1.7531-0.13248-5.615-0.40099-8.5818-0.59667-2.9668-0.1957-6.1666-0.41175-7.1106-0.48011-2.9751-0.21548-14.478-0.89178-24.152-1.42-1.1463-0.0626-3.7392-0.17176-5.762-0.24265-2.0228-0.0708-4.8364-0.18213-6.2525-0.2473-3.3524-0.15425-19.217-0.77515-23.784-0.93086-1.9554-0.0666-7.0861-0.17754-11.402-0.24636-4.3154-0.0688-9.5012-0.19438-11.524-0.27892-11.905-0.49783-71.031-0.0682-88.27 0.64144-19.964 0.82174-32.459 1.4699-34.205 1.7745-0.33713 0.0588-2.1026 0.2178-3.9231 0.35329-5.5917 0.41625-5.3997 0.72373 0.3678 0.58917 39.94-0.9319 45.761-1.0483 61.789-1.2358 37.697-0.44092 79.624-0.0287 102.74 1.0104 1.4834 0.0666 5.29 0.22576 8.4592 0.35346 6.6658 0.26865 10.211 0.43798 12.627 0.60303 0.94397 0.0644 5.1368 0.27314 9.3174 0.46371 8.6932 0.39632 11.141 0.52575 15.938 0.84272 1.888 0.12476 7.129 0.43951 11.647 0.69943 9.2105 0.53002 21.665 1.3183 26.113 1.6528 5.0496 0.37979 9.9305 0.54385 9.9266 0.33367z";
  const discTabPath = "m400.16 390.23c2.8987-1.2319 3.4612-1.5341 6.8655-3.6878 13.452-8.5106 22.636-21.015 28.197-38.39 3.5773-11.178 3.6236-16.899 0.1221-15.084-1.1568 0.59973-7.2617 8.9684-13.862 19.002-5.9979 9.1178-13.693 19.527-19.337 26.156-6.9128 8.1192-8.483 10.305-8.483 11.808 0 1.8998 2.3236 1.9698 6.4976 0.19583z";

  // Calculate fill - the disc inner area fills from bottom up to second rim line
  // Bottom of bowl: ~380, Second rim line (discRim2Path): ~262
  // For overfull (>100%), fill covers entire bowl (up to ~200 or higher)
  const normalFillHeight = 118; // 380 - 262 = normal fill area (0-100%)
  const overflowExtra = clampedFullness > 100 ? ((clampedFullness - 100) / 50) * 80 : 0; // Extra height for overfull
  const fillHeight = Math.min(clampedFullness, 100) / 100 * normalFillHeight + overflowExtra;
  const currentY = 380 - fillHeight;

  const curveIntensity = 6;
  const curvedLiquidPath = `
    M 50 ${currentY - 20}
    Q 313 ${currentY + curveIntensity} 570 ${currentY - 20}
    V 450
    H 50
    Z
  `;

  const strokeColor = "#5b7a82"; // Brand teal color for cohesive look
  const strokeOpacity = 0.9; // Good visibility
  const uniqueId = useId().replace(/:/g, '');
  const primaryColor = fillColor || '#5b7a82';
  const secondaryColor = fillColor || '#5b7a82';

  // Calculate overflow puddle size (appears when > 100%)
  const overflowAmount = Math.max(0, clampedFullness - 100);
  const puddleRadiusX = overflowAmount > 0 ? 40 + (overflowAmount / 50) * 120 : 0; // grows from 40 to 160
  const puddleRadiusY = overflowAmount > 0 ? 15 + (overflowAmount / 50) * 40 : 0; // grows from 15 to 55

  return (
    <svg 
      width="120" 
      height="120" 
      viewBox="0 0 614 580" 
      style={{ overflow: 'hidden' }}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={t('lab.devices.iconDisc')}
    >
      <defs>
        <linearGradient id={`discLiquidGradient-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={primaryColor} />
          <stop offset="100%" stopColor={secondaryColor} />
        </linearGradient>
        
        <radialGradient id={`puddleGradient-${uniqueId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={primaryColor} stopOpacity="0.9" />
          <stop offset="70%" stopColor={secondaryColor} stopOpacity="0.7" />
          <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.4" />
        </radialGradient>
        
        <clipPath id={`discInnerClip-${uniqueId}`}>
          <path d={discInnerPath} />
        </clipPath>
        
        {/* Elegant layered shadow effect for disc */}
        <filter id={`discShadow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur1" />
          <feOffset dx="0" dy="1.5" result="offsetblur1" />
          <feComponentTransfer result="shadow1">
            <feFuncA type="linear" slope="0.08" />
          </feComponentTransfer>
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur2" />
          <feOffset dx="0" dy="4" result="offsetblur2" />
          <feComponentTransfer result="shadow2">
            <feFuncA type="linear" slope="0.06" />
          </feComponentTransfer>
          <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur3" />
          <feOffset dx="0" dy="8" result="offsetblur3" />
          <feComponentTransfer result="shadow3">
            <feFuncA type="linear" slope="0.04" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="shadow3" />
            <feMergeNode in="shadow2" />
            <feMergeNode in="shadow1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Overflow puddle - appears below disc when overfull */}
      {overflowAmount > 0 && (
        <ellipse
          cx="307"
          cy="520"
          rx={puddleRadiusX}
          ry={puddleRadiusY}
          fill={`url(#puddleGradient-${uniqueId})`}
          className="transition-all duration-500 ease-in-out"
        />
      )}

      <g transform="matrix(-1.8333 0 0 1.9751 911.96 -367.69)" filter={`url(#discShadow-${uniqueId})`}>
        {/* Liquid Fill - clipped to inner disc bowl */}
        {clampedFullness > 0 && (
          <path 
            d={curvedLiquidPath}
            fill={`url(#discLiquidGradient-${uniqueId})`}
            clipPath={`url(#discInnerClip-${uniqueId})`}
            className="transition-all duration-700 ease-in-out"
          />
        )}

        {/* Disc outline paths - visible and clean */}
        <path d={discOuterPath} fill="none" stroke={strokeColor} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" style={{ strokeOpacity }} />
        <path d={discInnerPath} fill="none" stroke={strokeColor} strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" style={{ strokeOpacity: strokeOpacity * 0.85 }} />
        <path d={discRim1Path} fill="none" stroke={strokeColor} strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" style={{ strokeOpacity: strokeOpacity * 0.8 }} />
        <path d={discRim2Path} fill="none" stroke={strokeColor} strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" style={{ strokeOpacity: strokeOpacity * 0.8 }} />
        <path d={discTabPath} fill="none" stroke={strokeColor} strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" style={{ strokeOpacity }} />
      </g>
      
      {/* Percentage Text */}
      {showPercentage && (
        <text
          x="307"
          y="320"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="80"
          fontWeight="800"
          fill="#2a455b"
          style={{ opacity: 0.95, letterSpacing: '-0.02em' }}
        >
          {Math.round(percent || 0)}%
        </text>
      )}
    </svg>
  );
}

export function PadSVG({ percent = 60, fillColor, showPercentage = false }: { percent?: number; fillColor?: string; showPercentage?: boolean }) {
  const { t } = useTranslation();
  const fillLevel = Math.max(0, Math.min(100, percent));
  
  // Use dynamic fillColor if provided, otherwise use theme colors
  const primaryColor = fillColor || '#10b981';
  const secondaryColor = fillColor || '#059669';
  const strokeColor = "#5b7a82"; // Brand teal color
  const strokeOpacity = 0.9;
  const uniqueId = useId().replace(/:/g, '');
  
  // Pad paths from the new design
  const padOuterPath = "m438.87 416.16c35.176-4.668 46.432-26.651 36.717-71.708-2.0485-9.5014-2.195-9.1681 4.9644-11.295 13.351-3.9664 14.576-6.4534 14.576-29.604 0-23.178-1.0285-25.287-14.38-29.484-7.3652-2.3153-7.2005-1.951-5.1601-11.415 10.681-49.542-4.166-71.94-47.695-71.952-42.557-0.0118-57.481 21.412-48.212 69.207 2.5204 12.996 2.7945 12.064-4.1435 14.081-13.653 3.9694-14.881 6.4086-14.881 29.563 0 23.154 1.2278 25.593 14.881 29.563 6.9532 2.0215 6.6607 0.93157 3.9711 14.799-9.6558 49.786 11.882 74.546 59.362 68.245z";
  const padInnerPath = "m413.535 411.3525c-25.713-4.8072-35.079-19.681-31.52-50.053 0.79242-6.7624 1.5978-12.534 1.7898-12.827 5.9346-9.0387 5.9093-80.84-0.0316-89.888-1.4608-2.225-3.1542-26.45-2.2589-32.315 3.2967-21.599 17.708-31.336 46.378-31.336 42.479 0 53.197 17.995 42.464 71.294-4.2987 21.346-4.3011 53.295-5e-3 74.624 6.9975 34.744 5.5658 49.749-5.765 60.421-10.152 9.5619-31.393 13.756-51.051 10.081z";
  const padSidePath1 = "m471.842 322.1655c-1.7038-18.542-0.33821-45.569 2.3026-45.569 12.211 0 15.931 5.5194 16.477 24.442 0.62942 21.831-0.10483 24.026-9.1816 27.456-8.7023 3.2884-8.7151 3.28-9.598-6.3283z";
  const padSidePath2 = "m374.74 328.5329c-9.8074-3.3907-15.012-38.207-6.9218-46.305 2.0329-2.0351 14.015-6.483 14.991-5.5648 1.0228 0.96281 2.5021 26.879 1.9744 34.592-1.4791 21.623-0.80949 20.471-10.043 17.278z";
  
  // Center of the pad inner area (approximate)
  const centerX = 428;
  const centerY = 303;
  
  // Maximum radius for the ellipse to fill the entire pad area at 100%
  const maxRadiusX = 60; // Horizontal spread - increased to cover full width
  const maxRadiusY = 130; // Vertical spread - increased to cover full height
  
  // Calculate ellipse radii based on fill percentage
  const currentRadiusX = (fillLevel / 100) * maxRadiusX;
  const currentRadiusY = (fillLevel / 100) * maxRadiusY;
  
  // Number of layered ellipses for gradient effect
  const numLayers = 5;

  return (
    <svg 
      width="120" 
      height="120" 
      viewBox="0 0 265 473" 
      style={{ overflow: 'hidden' }}
      preserveAspectRatio="xMidYMid meet"
      role="img" 
      aria-label={t('lab.devices.iconPad')}
    >
      <defs>
        <radialGradient id={`padRadialGradient-${uniqueId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={primaryColor} stopOpacity="0.95" />
          <stop offset="50%" stopColor={primaryColor} stopOpacity="0.8" />
          <stop offset="80%" stopColor={secondaryColor} stopOpacity="0.6" />
          <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.3" />
        </radialGradient>
        
        <clipPath id={`padInnerClip-${uniqueId}`}>
          <path d={padInnerPath} />
        </clipPath>
        
        {/* Elegant layered shadow effect */}
        <filter id={`padShadow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur1" />
          <feOffset dx="0" dy="1.5" result="offsetblur1" />
          <feComponentTransfer result="shadow1">
            <feFuncA type="linear" slope="0.08" />
          </feComponentTransfer>
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur2" />
          <feOffset dx="0" dy="4" result="offsetblur2" />
          <feComponentTransfer result="shadow2">
            <feFuncA type="linear" slope="0.06" />
          </feComponentTransfer>
          <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur3" />
          <feOffset dx="0" dy="8" result="offsetblur3" />
          <feComponentTransfer result="shadow3">
            <feFuncA type="linear" slope="0.04" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="shadow3" />
            <feMergeNode in="shadow2" />
            <feMergeNode in="shadow1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g transform="matrix(-1.8333 0 0 1.9751 911.96 -367.69)" filter={`url(#padShadow-${uniqueId})`}>
        {/* Elliptical fill expanding from center - clipped to inner pad area */}
        {fillLevel > 0 && (
          <g clipPath={`url(#padInnerClip-${uniqueId})`}>
            {/* Layered ellipses for gradient effect - outer to inner */}
            {Array.from({ length: numLayers }).map((_, i) => {
              const layerFactor = 1 - (i / numLayers) * 0.3; // Each layer slightly smaller
              const rx = currentRadiusX * layerFactor;
              const ry = currentRadiusY * layerFactor;
              const opacity = 0.3 + (i / numLayers) * 0.5; // Inner layers more opaque
              
              return (
                <ellipse
                  key={i}
                  cx={centerX}
                  cy={centerY}
                  rx={rx}
                  ry={ry}
                  fill={i === numLayers - 1 ? primaryColor : secondaryColor}
                  opacity={opacity}
                  className="transition-all duration-700 ease-in-out"
                />
              );
            })}
          </g>
        )}

        {/* Pad outline paths */}
        <path d={padOuterPath} fill="none" stroke={strokeColor} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" style={{ strokeOpacity }} />
        <path d={padInnerPath} fill="none" stroke={strokeColor} strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" style={{ strokeOpacity: strokeOpacity * 0.7 }} />
        <path d={padSidePath1} fill="none" stroke={strokeColor} strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" style={{ strokeOpacity: strokeOpacity * 0.6 }} />
        <path d={padSidePath2} fill="none" stroke={strokeColor} strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" style={{ strokeOpacity: strokeOpacity * 0.6 }} />
      </g>
      
      {/* Percentage Text */}
      {showPercentage && (
        <text
          x="132.5"
          y="236.5"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="60"
          fontWeight="800"
          fill="#2a455b"
          style={{ opacity: 0.95, letterSpacing: '-0.02em' }}
        >
          {Math.round(percent || 0)}%
        </text>
      )}
    </svg>
  );
}

export function TamponSVG({ percent = 60, fillColor, showPercentage = false }: { percent?: number; fillColor?: string; showPercentage?: boolean }) {
  const { t } = useTranslation();
  const fillLevel = Math.max(0, Math.min(100, percent));
  
  // Use dynamic fillColor if provided, otherwise use theme colors
  const primaryColor = fillColor || '#10b981';
  const secondaryColor = fillColor || '#059669';
  const strokeColor = "#5b7a82"; // Brand teal color
  const strokeOpacity = 0.9;
  const uniqueId = useId().replace(/:/g, '');
  
  // Tampon path from the new design
  const tamponPath = "m432.59 416.51c2.4735-1.9758 2.2837-12.402-0.43524-23.914-3.1482-13.329-2.8478-17.03 2.0259-24.959 5.1975-8.4559 5.3862-12.81 0.98245-22.666-4.8444-10.842-4.8973-10.762 7.0944-10.762 7.5926 0 10.504-0.38889 11.361-1.5178 2.5623-3.3728 0.95389-113.14-1.7447-119.07-9.8468-21.642-36.813-21.869-47.185-0.3969-2.9723 6.1537-4.8797 115.78-2.0786 119.47 0.86246 1.1353 3.8206 1.5178 11.736 1.5178 10.583 0 9.8788-0.98069 11.028 4.0036 0.63186 2.7413 2.938 8.1912 4.264 10.912 3.138 6.4397 3.0417 8.5261-0.65042 14.094-6.6137 9.974-7.0054 13.777-3.2459 31.514 1.6813 7.9324 2.3569 13.554 1.9893 16.554-0.65626 5.3554 1.624 7.8069 4.8584 5.2233z";
  
  // Calculate fill from top to bottom
  // The tampon body spans roughly from Y=185 to Y=420 in the original coordinate system
  // Extended topY to cover the rounded tip at the top
  const topY = 185;
  const bottomY = 420;
  const totalHeight = bottomY - topY;
  const fillHeight = (fillLevel / 100) * totalHeight;
  const fillBottomY = topY + fillHeight;

  const fillPath = `
    M 390 ${topY}
    H 465
    V ${fillBottomY}
    H 390
    Z
  `;

  return (
    <svg 
      width="120" 
      height="120" 
      viewBox="0 0 261 473" 
      style={{ overflow: 'hidden' }}
      preserveAspectRatio="xMidYMid meet"
      role="img" 
      aria-label={t('lab.devices.iconTampon')}
    >
      <defs>
        <linearGradient id={`tamponLiquidGradient-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={primaryColor} />
          <stop offset="100%" stopColor={secondaryColor} />
        </linearGradient>
        
        <clipPath id={`tamponClip-${uniqueId}`}>
          <path d={tamponPath} />
        </clipPath>
        
        {/* Elegant layered shadow effect */}
        <filter id={`tamponShadow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur1" />
          <feOffset dx="0" dy="1.5" result="offsetblur1" />
          <feComponentTransfer result="shadow1">
            <feFuncA type="linear" slope="0.08" />
          </feComponentTransfer>
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur2" />
          <feOffset dx="0" dy="4" result="offsetblur2" />
          <feComponentTransfer result="shadow2">
            <feFuncA type="linear" slope="0.06" />
          </feComponentTransfer>
          <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur3" />
          <feOffset dx="0" dy="8" result="offsetblur3" />
          <feComponentTransfer result="shadow3">
            <feFuncA type="linear" slope="0.04" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="shadow3" />
            <feMergeNode in="shadow2" />
            <feMergeNode in="shadow1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g transform="matrix(-1.8333 0 0 1.9751 911.96 -367.69)" filter={`url(#tamponShadow-${uniqueId})`}>
        {/* Liquid Fill - from top to bottom, clipped to tampon shape */}
        {fillLevel > 0 && (
          <path 
            d={fillPath}
            fill={`url(#tamponLiquidGradient-${uniqueId})`}
            clipPath={`url(#tamponClip-${uniqueId})`}
            className="transition-all duration-700 ease-in-out"
          />
        )}

        {/* Tampon outline path */}
        <path d={tamponPath} fill="none" stroke={strokeColor} strokeWidth="1.0" strokeLinecap="round" strokeLinejoin="round" style={{ strokeOpacity }} />
        
        {/* String line */}
        <rect 
          transform="scale(-1,1)" 
          x="-435.77" 
          y="333.97" 
          width="13.558" 
          height="0.56296" 
          fill="none" 
          stroke={strokeColor} 
          strokeLinecap="round" 
          strokeWidth="0.6" 
          style={{ strokeOpacity: strokeOpacity * 0.7 }}
        />
      </g>
      
      {/* Percentage Text */}
      {showPercentage && (
        <text
          x="130.5"
          y="300"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="100"
          fontWeight="800"
          fill="#2a455b"
          style={{ opacity: 0.95, letterSpacing: '-0.02em' }}
        >
          {Math.round(percent || 0)}%
        </text>
      )}
    </svg>
  );
}
