import { useMemo } from "react";
import type {
  StationConfig,
  StationReading,
  LocalizationResult,
} from "@/types";
import { CHINA_BOUNDS, MAJOR_CITIES, type QuakeParams } from "../types";

interface LocalizationMapProps {
  stations: StationConfig[];
  readings: StationReading[];
  localizationResult: LocalizationResult | null;
  quakeParams: QuakeParams;
  coordToSvg: (lat: number, lon: number, width: number, height: number) => { x: number; y: number };
  width: number;
  height: number;
}

export function LocalizationMap({
  stations,
  readings,
  localizationResult,
  quakeParams,
  coordToSvg,
  width,
  height,
}: LocalizationMapProps) {
  const renderMap = useMemo(() => {
    const latLines = [];
    const lonLines = [];

    for (let lat = 20; lat <= 50; lat += 10) {
      const { y } = coordToSvg(lat, CHINA_BOUNDS.minLon, width, height);
      latLines.push(
        <line
          key={`lat-${lat}`}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke="rgba(212,175,55,0.15)"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      );
    }

    for (let lon = 75; lon <= 135; lon += 10) {
      const { x } = coordToSvg(CHINA_BOUNDS.minLat, lon, width, height);
      lonLines.push(
        <line
          key={`lon-${lon}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke="rgba(212,175,55,0.15)"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      );
    }

    const cityMarkers = MAJOR_CITIES.map((city) => {
      const { x, y } = coordToSvg(city.lat, city.lon, width, height);
      return (
        <g key={city.name}>
          <circle cx={x} cy={y} r={2} fill="rgba(184,115,51,0.6)" />
          <text
            x={x + 6}
            y={y + 4}
            fill="rgba(200,170,120,0.7)"
            fontSize={10}
            fontFamily="serif"
          >
            {city.name}
          </text>
        </g>
      );
    });

    const stationMarkers = stations.map((station) => {
      const { x, y } = coordToSvg(
        station.latitude_deg,
        station.longitude_deg,
        width,
        height
      );
      const reading = readings.find((r) => r.device_id === station.device_id);
      const hasReading = !!reading;

      return (
        <g key={station.device_id}>
          <circle
            cx={x}
            cy={y}
            r={10}
            fill={hasReading ? "rgba(194,59,34,0.2)" : "rgba(10,14,39,0.8)"}
            stroke={hasReading ? "#C23B22" : "#B87333"}
            strokeWidth={2}
          />
          <circle cx={x} cy={y} r={5} fill="#D4AF37" />
          <text
            x={x + 14}
            y={y + 4}
            fill="#D4AF37"
            fontSize={10}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {station.device_id}
          </text>
          <text
            x={x + 14}
            y={y + 16}
            fill="rgba(200,170,120,0.6)"
            fontSize={9}
            fontFamily="monospace"
          >
            {station.latitude_deg.toFixed(1)}°N, {station.longitude_deg.toFixed(1)}°E
          </text>
        </g>
      );
    });

    const directionLines = readings
      .map((reading) => {
        const station = stations.find((s) => s.device_id === reading.device_id);
        if (!station || reading.azimuth_deg === undefined) return null;

        const { x: sx, y: sy } = coordToSvg(
          station.latitude_deg,
          station.longitude_deg,
          width,
          height
        );

        const azimuthRad = (reading.azimuth_deg * Math.PI) / 180;
        const lineLength = 200;
        const dx = Math.sin(azimuthRad) * lineLength;
        const dy = -Math.cos(azimuthRad) * lineLength;

        return (
          <g key={`dir-${reading.device_id}`}>
            <line
              x1={sx}
              y1={sy}
              x2={sx + dx}
              y2={sy + dy}
              stroke="rgba(194,59,34,0.6)"
              strokeWidth={1.5}
              strokeDasharray="8,4"
            />
            <polygon
              points={`${sx + dx},${sy + dy} ${sx + dx - 8},${sy + dy - 4} ${sx + dx - 4},${sy + dy} ${sx + dx - 8},${sy + dy + 4}`}
              fill="rgba(194,59,34,0.8)"
            />
          </g>
        );
      })
      .filter(Boolean);

    const epicenterMarker = localizationResult?.best_estimate ? (() => {
      const est = localizationResult.best_estimate;
      const { x, y } = coordToSvg(est.latitude_deg, est.longitude_deg, width, height);
      const kmPerDeg = 111;
      const ellipseScale = width / (CHINA_BOUNDS.maxLon - CHINA_BOUNDS.minLon) / kmPerDeg;

      return (
        <g>
          <ellipse
            cx={x}
            cy={y}
            rx={(est.error_ellipse.major_axis_km * ellipseScale * Math.cos((est.latitude_deg * Math.PI) / 180)) || 10}
            ry={(est.error_ellipse.minor_axis_km * ellipseScale) || 10}
            transform={`rotate(${est.error_ellipse.orientation_deg}, ${x}, ${y})`}
            fill="rgba(194,59,34,0.15)"
            stroke="rgba(194,59,34,0.6)"
            strokeWidth={1.5}
            strokeDasharray="6,3"
          />
          <circle cx={x} cy={y} r={20} fill="url(#epicenterGlow)" opacity={0.8}>
            <animate
              attributeName="r"
              values="15;25;15"
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.8;0.3;0.8"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx={x} cy={y} r={8} fill="#C23B22" stroke="#D4AF37" strokeWidth={2} />
          <circle cx={x} cy={y} r={3} fill="#D4AF37" />
          <text
            x={x + 16}
            y={y - 10}
            fill="#D4AF37"
            fontSize={11}
            fontFamily="monospace"
            fontWeight="bold"
          >
            M{est.estimated_magnitude.toFixed(1)}
          </text>
          <text
            x={x + 16}
            y={y + 4}
            fill="#e5cba5"
            fontSize={9}
            fontFamily="monospace"
          >
            {est.latitude_deg.toFixed(2)}°N
          </text>
          <text
            x={x + 16}
            y={y + 16}
            fill="#e5cba5"
            fontSize={9}
            fontFamily="monospace"
          >
            {est.longitude_deg.toFixed(2)}°E
          </text>
        </g>
      );
    })() : null;

    const candidateMarkers = localizationResult?.candidate_estimates?.map((cand, idx) => {
      const { x, y } = coordToSvg(cand.latitude_deg, cand.longitude_deg, width, height);
      return (
        <g key={`cand-${idx}`}>
          <circle
            cx={x}
            cy={y}
            r={5}
            fill="none"
            stroke="rgba(212,175,55,0.5)"
            strokeWidth={1.5}
            strokeDasharray="3,2"
          />
          <text
            x={x + 8}
            y={y + 3}
            fill="rgba(212,175,55,0.6)"
            fontSize={8}
            fontFamily="monospace"
          >
            #{idx + 1}
          </text>
        </g>
      );
    });

    const trueEpicenterMarker = (() => {
      const { x, y } = coordToSvg(quakeParams.epicenterLat, quakeParams.epicenterLon, width, height);
      return (
        <g>
          <circle cx={x} cy={y} r={12} fill="none" stroke="rgba(212,175,55,0.4)" strokeWidth={1} />
          <line x1={x - 15} y1={y} x2={x + 15} y2={y} stroke="rgba(212,175,55,0.4)" strokeWidth={1} />
          <line x1={x} y1={y - 15} x2={x} y2={y + 15} stroke="rgba(212,175,55,0.4)" strokeWidth={1} />
        </g>
      );
    })();

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <radialGradient id="epicenterGlow">
            <stop offset="0%" stopColor="#C23B22" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#C23B22" stopOpacity="0" />
          </radialGradient>
          <pattern id="mapGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke="rgba(212,175,55,0.08)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        <rect width={width} height={height} fill="url(#mapGrid)" />

        <rect
          x={1}
          y={1}
          width={width - 2}
          height={height - 2}
          fill="none"
          stroke="rgba(184,115,51,0.3)"
          strokeWidth={1.5}
          rx={4}
        />

        {latLines}
        {lonLines}

        <polygon
          points="
            80,400 120,420 160,410 200,430 250,420 300,440 350,430 400,450
            450,440 500,460 550,450 600,470 620,460 640,430 660,400 650,350
            640,300 620,250 600,200 580,150 550,120 500,80 450,60 400,50
            350,70 300,60 250,80 200,100 150,130 120,180 100,230 90,280
            85,330 80,370 80,400
          "
          fill="rgba(10,14,39,0.5)"
          stroke="rgba(184,115,51,0.5)"
          strokeWidth={1.5}
        />

        {cityMarkers}
        {directionLines}
        {candidateMarkers}
        {trueEpicenterMarker}
        {stationMarkers}
        {epicenterMarker}

        <g transform={`translate(10, ${height - 60})`}>
          <rect width={180} height={50} fill="rgba(10,14,39,0.8)" stroke="rgba(184,115,51,0.4)" rx={4} />
          <circle cx={15} cy={15} r={5} fill="#D4AF37" />
          <text x={28} y={19} fill="#e5cba5" fontSize={10}>台站</text>
          <circle cx={15} cy={35} r={6} fill="#C23B22" />
          <text x={28} y={39} fill="#e5cba5" fontSize={10}>震中估计</text>
          <line x1={100} y1={15} x2={130} y2={15} stroke="rgba(194,59,34,0.6)" strokeWidth={1.5} strokeDasharray="8,4" />
          <text x={138} y={19} fill="#e5cba5" fontSize={10}>方位线</text>
        </g>
      </svg>
    );
  }, [stations, readings, localizationResult, quakeParams, coordToSvg, width, height]);

  return renderMap;
}
