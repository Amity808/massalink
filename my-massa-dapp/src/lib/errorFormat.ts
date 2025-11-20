export function extractReadableError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);

    const runtimeMatch = message.match(/Runtime error:\s*error:\s*([^\n]+)/i);
    if (runtimeMatch?.[1]) {
        return runtimeMatch[1].trim();
    }

    const genericMatch = message.match(/error:\s*([A-Za-z0-9 _-]+)/i);
    if (genericMatch?.[1]) {
        return genericMatch[1].trim();
    }

    const lastColonIndex = message.lastIndexOf(":");
    if (lastColonIndex !== -1) {
        return message.slice(lastColonIndex + 1).trim();
    }

    return message.trim();
}

