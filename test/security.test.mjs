import assert from "node:assert/strict";
import test from "node:test";

import {
    CAPABILITY_HEADER,
    authorizeCanvasRequest,
    authorizeLoopbackRequest,
    contentSecurityPolicy,
    createCapabilityToken,
    hasJsonContentType,
} from "../extensions/fourier-runtime-canvas/security.mjs";

function request(headers = {}) {
    return { headers };
}

test("loopback authorization requires exact host, origin, and capability", () => {
    const capabilityToken = createCapabilityToken();
    const options = {
        capabilityToken,
        expectedHost: "127.0.0.1:4567",
        expectedOrigin: "http://127.0.0.1:4567",
    };
    const url = new URL("http://127.0.0.1:4567/api/state");

    assert.equal(authorizeLoopbackRequest(request({
        host: options.expectedHost,
        origin: options.expectedOrigin,
        [CAPABILITY_HEADER]: capabilityToken,
    }), url, options), null);
    assert.equal(authorizeLoopbackRequest(request({
        host: "localhost:4567",
        [CAPABILITY_HEADER]: capabilityToken,
    }), url, options).error, "invalid_host");
    assert.equal(authorizeLoopbackRequest(request({
        host: options.expectedHost,
        origin: "https://attacker.example",
        [CAPABILITY_HEADER]: capabilityToken,
    }), url, options).error, "invalid_origin");
    assert.equal(authorizeLoopbackRequest(request({
        host: options.expectedHost,
        [CAPABILITY_HEADER]: "wrong",
    }), url, options).error, "invalid_capability");
    assert.equal(authorizeLoopbackRequest(request({
        host: options.expectedHost,
        [CAPABILITY_HEADER]: capabilityToken,
    }), new URL("https://attacker.example/api/state"), options).error, "invalid_target");
});

test("query capabilities are opt-in and JSON content types are strict", () => {
    const capabilityToken = createCapabilityToken();
    const options = {
        capabilityToken,
        expectedHost: "127.0.0.1:4567",
        expectedOrigin: "http://127.0.0.1:4567",
        allowQueryToken: true,
    };
    const url = new URL(`http://127.0.0.1:4567/events?token=${capabilityToken}`);

    assert.equal(authorizeLoopbackRequest(
        request({ host: options.expectedHost }),
        url,
        options,
    ), null);
    assert.equal(hasJsonContentType(request({
        "content-type": "application/json; charset=utf-8",
    })), true);
    assert.equal(hasJsonContentType(request({
        "content-type": "text/plain",
    })), false);
});

test("origin-form canvas requests authorize root, API, mutation, and SSE routes", () => {
    const capabilityToken = createCapabilityToken();
    const expectedHost = "127.0.0.1:4567";
    const expectedOrigin = `http://${expectedHost}`;
    const options = { capabilityToken, expectedHost, expectedOrigin };
    const cases = [
        {
            method: "GET",
            target: `/?token=${capabilityToken}`,
            headers: { host: expectedHost },
            path: "/",
        },
        {
            method: "GET",
            target: "/api/state",
            headers: {
                host: expectedHost,
                origin: expectedOrigin,
                [CAPABILITY_HEADER]: capabilityToken,
            },
            path: "/api/state",
        },
        {
            method: "POST",
            target: "/api/series",
            headers: {
                host: expectedHost,
                origin: expectedOrigin,
                "content-type": "application/json",
                [CAPABILITY_HEADER]: capabilityToken,
            },
            path: "/api/series",
        },
        {
            method: "GET",
            target: `/events?token=${capabilityToken}`,
            headers: { host: expectedHost, origin: expectedOrigin },
            path: "/events",
        },
    ];

    for (const value of cases) {
        const result = authorizeCanvasRequest(
            { method: value.method, headers: value.headers },
            value.target,
            options,
        );
        assert.equal(result.error, null);
        assert.equal(result.url.origin, expectedOrigin);
        assert.equal(result.url.pathname, value.path);
    }

    assert.equal(authorizeCanvasRequest(
        { method: "GET", headers: { host: "attacker.example", [CAPABILITY_HEADER]: capabilityToken } },
        "/api/state",
        options,
    ).error.error, "invalid_host");
    assert.equal(authorizeCanvasRequest(
        request({
            host: expectedHost,
            origin: "https://attacker.example",
            [CAPABILITY_HEADER]: capabilityToken,
        }),
        "/api/state",
        options,
    ).error.error, "invalid_origin");
    assert.equal(authorizeCanvasRequest(
        { method: "POST", headers: { host: expectedHost, [CAPABILITY_HEADER]: capabilityToken } },
        "/api/series",
        options,
    ).error.error, "unsupported_media_type");
});

test("CSP allows only the nonce-bearing inline script and same-origin data flow", () => {
    const policy = contentSecurityPolicy("test-nonce");
    assert.match(policy, /default-src 'none'/);
    assert.match(policy, /script-src 'nonce-test-nonce'/);
    assert.match(policy, /connect-src 'self'/);
    assert.doesNotMatch(policy, /unsafe-eval|https:/);
});
