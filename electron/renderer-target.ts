export type RendererTarget =
  | { type: "url"; value: string }
  | { type: "file"; value: string };

export function getRendererTarget(devServerUrl: string | undefined, rendererIndexPath: string): RendererTarget {
  if (devServerUrl) {
    return { type: "url", value: devServerUrl };
  }

  return { type: "file", value: rendererIndexPath };
}
