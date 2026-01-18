
self.onmessage = (e) => {
    try {
        const data = e.data;
        const json = JSON.stringify(data);
        const encoder = new TextEncoder();
        const buffer = encoder.encode(json);
        // @ts-ignore - The type definition for postMessage transfer list is slightly incorrect in some environments
        self.postMessage({ buffer }, [buffer.buffer]);
    } catch (error) {
        if (error instanceof Error) {
            self.postMessage({ error: error.message });
        } else {
            self.postMessage({ error: String(error) });
        }
    }
};
