import { randomBytes, timingSafeEqual } from "node:crypto";

export const CAPABILITY_HEADER = "x-fourier-capability";

export function createCapabilityToken() {
    return randomBytes(32).toString("base64url");
}

export function createScriptNonce() {
    return randomBytes(18).toString("base64url");
}

function tokenMatches(actual, expected) {
    if (typeof actual !== "string") {
        return false;
    }
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length
        && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function authorizeLoopbackRequest(req, url, options) {
    if (req.headers.host !== options.expectedHost) {
        return { status: 403, error: "invalid_host" };
    }
    const origin = req.headers.origin;
    if (origin && origin !== options.expectedOrigin) {
        return { status: 403, error: "invalid_origin" };
    }
    if (url.origin !== options.expectedOrigin) {
        return { status: 403, error: "invalid_target" };
    }
    const suppliedToken = options.allowQueryToken
        ? url.searchParams.get("token")
        : req.headers[CAPABILITY_HEADER];
    if (!tokenMatches(suppliedToken, options.capabilityToken)) {
        return { status: 401, error: "invalid_capability" };
    }
    return null;
}

export function hasJsonContentType(req) {
    const contentType = req.headers["content-type"];
    return typeof contentType === "string"
        && /^application\/json(?:\s*;|$)/i.test(contentType);
}

export function authorizeCanvasRequest(req, requestTarget, options) {
    let url;
    try {
        url = new URL(requestTarget ?? "/", options.expectedOrigin);
    } catch {
        return {
            url: null,
            error: { status: 400, error: "invalid_target" },
        };
    }
    const allowQueryToken = (
        req.method === "GET"
        && (url.pathname === "/" || url.pathname === "/events")
    );
    const authorizationError = authorizeLoopbackRequest(req, url, {
        ...options,
        allowQueryToken,
    });
    if (authorizationError) {
        return { url, error: authorizationError };
    }
    if (
        !["GET", "HEAD"].includes(req.method)
        && !hasJsonContentType(req)
    ) {
        return {
            url,
            error: { status: 415, error: "unsupported_media_type" },
        };
    }
    return { url, error: null };
}

export function contentSecurityPolicy(nonce) {
    return [
        "default-src 'none'",
        `script-src 'nonce-${nonce}'`,
        "style-src 'unsafe-inline'",
        "connect-src 'self'",
        "img-src 'self' data: blob:",
        "font-src 'none'",
        "media-src 'none'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        "worker-src 'none'",
    ].join("; ");
}
