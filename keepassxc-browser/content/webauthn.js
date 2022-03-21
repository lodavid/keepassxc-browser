'use strict';

// Posts a message to extension's content script and waits for response
const postMessageToExtension = function(request) {
    return new Promise((resolve, reject) => {
        const ev = document;

        const listener = ((messageEvent) => {
            const handler = (msg) => {
                if (msg && msg.type === 'kpxc-webauthn-response' && msg.detail) {
                    messageEvent.removeEventListener('kpxc-webauthn-response', listener);
                    resolve(msg.detail);
                    return;
                }
            };
            return handler;
        })(ev);
        ev.addEventListener('kpxc-webauthn-response', listener);

        // Send the request
        document.dispatchEvent(new CustomEvent('kpxc-webauthn-request', { detail: request }));
    });
};

(async () => {
    const originalCredentials = navigator.credentials;

    const webauthnCredentials = {
        async create(options) {
            if (!options.publicKey) {
                return null;
            }

            const response = await postMessageToExtension({ action: 'webauthn_create', publicKey: options.publicKey });
            if (!response.publicKey) {
                return response.fallback ? originalCredentials.create(options) : null;
            }

            response.publicKey.getClientExtensionResults = () => {};
            return response.publicKey;
        },
        async get(options) {
            if (!options.publicKey) {
                return null;
            }

            const response = await postMessageToExtension({ action: 'webauthn_get', publicKey: options.publicKey });
            if (!response.publicKey) {
                return response.fallback ? originalCredentials.get(options) : null;
            }

            response.publicKey.getClientExtensionResults = () => {};
            return response.publicKey;
        }
    };

    // Overwrite navigator.credentials
    try {
        Object.defineProperty(navigator, 'credentials', { value: webauthnCredentials });
    } catch (err) {
        console.log('Cannot override navigator.credentials: ', err);
    }
})();
