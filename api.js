(() => {
  let userId;
  const channel =
    typeof BroadcastChannel === 'function'
      ? new BroadcastChannel('fir-session')
      : null;
  if (channel) channel.onmessage = () => window.location.reload();
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) window.location.reload();
  });
  window.FIR = {
    setUser(user) {
      userId = user.id;
    },
    sessionChanged() {
      channel?.postMessage('changed');
    },
    async request(path, method = 'GET', data) {
      let response;
      try {
        response = await fetch(`/api${path}`, {
          method,
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            ...(userId ? { 'X-FIR-User': userId } : {}),
          },
          body: data === undefined ? undefined : JSON.stringify(data),
        });
      } catch {
        throw new Error(
          'Cannot reach the server. Check your connection and try again.',
        );
      }
      const result = await response.json();
      if (!response.ok) {
        if (
          response.status === 401 &&
          !['/login', '/register'].includes(path)
        ) {
          document.querySelector('main')?.setAttribute('hidden', '');
          window.location.replace('/index.html');
        }
        throw new Error(result.error || 'Request failed. Please try again.');
      }
      return result;
    },
  };
})();
