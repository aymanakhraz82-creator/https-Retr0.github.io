/**
 * Freebuff Sites entrypoint for this static site.
 *
 * Every tool runs in the browser, so the Worker only needs to serve the built
 * files in dist/ through the ASSETS binding.
 */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
