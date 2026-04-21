import type { DecorativeElement, SectorShapeConfig } from "@/lib/stadium/stadium-types";

function polarToCartesian(cx: number, cy: number, radius: number, angleDegrees: number) {
  const angleRadians = (Math.PI / 180) * angleDegrees;
  return {
    x: cx + radius * Math.cos(angleRadians),
    y: cy + radius * Math.sin(angleRadians),
  };
}

export function getSectorPath(shape: SectorShapeConfig) {
  switch (shape.type) {
    case "rectangle": {
      const rx = shape.rx ?? 0;
      if (!rx) {
        return `M ${shape.x} ${shape.y} H ${shape.x + shape.width} V ${shape.y + shape.height} H ${shape.x} Z`;
      }

      return [
        `M ${shape.x + rx} ${shape.y}`,
        `H ${shape.x + shape.width - rx}`,
        `Q ${shape.x + shape.width} ${shape.y} ${shape.x + shape.width} ${shape.y + rx}`,
        `V ${shape.y + shape.height - rx}`,
        `Q ${shape.x + shape.width} ${shape.y + shape.height} ${shape.x + shape.width - rx} ${shape.y + shape.height}`,
        `H ${shape.x + rx}`,
        `Q ${shape.x} ${shape.y + shape.height} ${shape.x} ${shape.y + shape.height - rx}`,
        `V ${shape.y + rx}`,
        `Q ${shape.x} ${shape.y} ${shape.x + rx} ${shape.y}`,
        "Z",
      ].join(" ");
    }
    case "trapezoid": {
      const skew = shape.skew ?? 0;
      const leftTopX = shape.x + Math.max(skew, 0);
      const rightTopX = leftTopX + shape.topWidth;
      const leftBottomX = shape.x + Math.max(-skew, 0);
      const rightBottomX = leftBottomX + shape.bottomWidth;

      return [
        `M ${leftTopX} ${shape.y}`,
        `L ${rightTopX} ${shape.y}`,
        `L ${rightBottomX} ${shape.y + shape.height}`,
        `L ${leftBottomX} ${shape.y + shape.height}`,
        "Z",
      ].join(" ");
    }
    case "polygon":
      return `${shape.points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")} Z`;
    case "custom-path":
      return shape.path;
    case "curve-left": {
      const { x, y, width, height, curveDepth } = shape;
      return [
        `M ${x + curveDepth} ${y}`,
        `H ${x + width}`,
        `V ${y + height}`,
        `H ${x + curveDepth}`,
        `Q ${x - curveDepth} ${y + height / 2} ${x + curveDepth} ${y}`,
        "Z",
      ].join(" ");
    }
    case "curve-right": {
      const { x, y, width, height, curveDepth } = shape;
      return [
        `M ${x} ${y}`,
        `H ${x + width - curveDepth}`,
        `Q ${x + width + curveDepth} ${y + height / 2} ${x + width - curveDepth} ${y + height}`,
        `H ${x}`,
        "Z",
      ].join(" ");
    }
    case "arc": {
      const outerStart = polarToCartesian(shape.cx, shape.cy, shape.outerRadius, shape.startAngle);
      const outerEnd = polarToCartesian(shape.cx, shape.cy, shape.outerRadius, shape.endAngle);
      const innerEnd = polarToCartesian(shape.cx, shape.cy, shape.innerRadius, shape.endAngle);
      const innerStart = polarToCartesian(shape.cx, shape.cy, shape.innerRadius, shape.startAngle);
      const largeArcFlag = Math.abs(shape.endAngle - shape.startAngle) > 180 ? 1 : 0;

      return [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${shape.outerRadius} ${shape.outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
        `L ${innerEnd.x} ${innerEnd.y}`,
        `A ${shape.innerRadius} ${shape.innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
        "Z",
      ].join(" ");
    }
    default:
      return "";
  }
}

export function getSectorLabelPosition(shape: SectorShapeConfig) {
  if (shape.labelPosition) {
    return shape.labelPosition;
  }

  switch (shape.type) {
    case "rectangle":
      return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
    case "trapezoid":
      return {
        x: shape.x + Math.max(shape.topWidth, shape.bottomWidth) / 2,
        y: shape.y + shape.height / 2,
      };
    case "polygon": {
      const total = shape.points.reduce(
        (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
        { x: 0, y: 0 },
      );
      return { x: total.x / shape.points.length, y: total.y / shape.points.length };
    }
    case "custom-path":
      return { x: 0, y: 0 };
    case "curve-left":
    case "curve-right":
      return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
    case "arc": {
      const midAngle = (shape.startAngle + shape.endAngle) / 2;
      const midRadius = (shape.innerRadius + shape.outerRadius) / 2;
      return polarToCartesian(shape.cx, shape.cy, midRadius, midAngle);
    }
    default:
      return { x: 0, y: 0 };
  }
}

export function getDecorationProps(element: DecorativeElement) {
  switch (element.kind) {
    case "line":
      return {
        type: "line" as const,
        props: {
          x1: element.x1,
          y1: element.y1,
          x2: element.x2,
          y2: element.y2,
          stroke: element.stroke ?? "rgba(17,17,17,0.18)",
          strokeWidth: element.strokeWidth ?? 2,
          opacity: element.opacity ?? 1,
        },
      };
    case "rect":
      return {
        type: "rect" as const,
        props: {
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          rx: element.rx ?? 0,
          fill: element.fill ?? "rgba(17,17,17,0.04)",
          opacity: element.opacity ?? 1,
        },
      };
    case "path":
      return {
        type: "path" as const,
        props: {
          d: element.path,
          fill: element.fill ?? "transparent",
          stroke: element.stroke ?? "rgba(17,17,17,0.12)",
          strokeWidth: element.strokeWidth ?? 2,
          opacity: element.opacity ?? 1,
        },
      };
    case "text":
      return {
        type: "text" as const,
        props: {
          x: element.x,
          y: element.y,
          fill: element.fill ?? "rgba(17,17,17,0.54)",
          fontSize: element.fontSize ?? 12,
          textAnchor: element.textAnchor ?? "middle",
          opacity: element.opacity ?? 1,
          value: element.value,
        },
      };
    default:
      return null;
  }
}

export function translateSectorShape(
  shape: SectorShapeConfig,
  deltaX: number,
  deltaY: number,
): SectorShapeConfig {
  const labelPosition = shape.labelPosition
    ? {
        x: shape.labelPosition.x + deltaX,
        y: shape.labelPosition.y + deltaY,
      }
    : undefined;

  switch (shape.type) {
    case "rectangle":
      return {
        ...shape,
        x: shape.x + deltaX,
        y: shape.y + deltaY,
        labelPosition,
      };
    case "trapezoid":
      return {
        ...shape,
        x: shape.x + deltaX,
        y: shape.y + deltaY,
        labelPosition,
      };
    case "curve-left":
    case "curve-right":
      return {
        ...shape,
        x: shape.x + deltaX,
        y: shape.y + deltaY,
        labelPosition,
      };
    case "arc":
      return {
        ...shape,
        cx: shape.cx + deltaX,
        cy: shape.cy + deltaY,
        labelPosition,
      };
    case "polygon":
      return {
        ...shape,
        points: shape.points.map((point) => ({
          x: point.x + deltaX,
          y: point.y + deltaY,
        })),
        labelPosition,
      };
    case "custom-path":
      return {
        ...shape,
        labelPosition,
      };
    default:
      return shape;
  }
}

export function translateDecoration(
  decoration: DecorativeElement,
  deltaX: number,
  deltaY: number,
): DecorativeElement {
  switch (decoration.kind) {
    case "rect":
      return {
        ...decoration,
        x: decoration.x + deltaX,
        y: decoration.y + deltaY,
      };
    case "line":
      return {
        ...decoration,
        x1: decoration.x1 + deltaX,
        y1: decoration.y1 + deltaY,
        x2: decoration.x2 + deltaX,
        y2: decoration.y2 + deltaY,
      };
    case "path":
      return decoration;
    case "text":
      return {
        ...decoration,
        x: decoration.x + deltaX,
        y: decoration.y + deltaY,
      };
    default:
      return decoration;
  }
}

export function resizeRectDecoration(
  decoration: Extract<DecorativeElement, { kind: "rect" }>,
  deltaX: number,
  deltaY: number,
) {
  return {
    ...decoration,
    width: Math.max(40, decoration.width + deltaX),
    height: Math.max(40, decoration.height + deltaY),
  };
}
