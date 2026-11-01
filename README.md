# Reverse Proxy

A small reverse proxy built as a learning project. I used it to explore how a proxy can accept an HTTP request, choose an upstream from configuration, and send the upstream response back to the client. It is intentionally simple and is not intended to be a production-ready proxy yet.

## What it currently does

- Loads YAML configuration and validates its structure with Zod.
- Starts a Node.js cluster with a configurable number of worker processes.
- Matches the incoming URL path against configured routes with `path-to-regexp`.
- Sends the request path to the configured upstream and returns its status code and response body.
- Uses a request ID to associate each worker response with the correct client request.

The first matching rule in `server.rules` wins, so put more specific patterns before broader patterns.

## Requirements

- Node.js 20 or newer
- npm

## Run locally

From the project directory, install dependencies and compile the TypeScript:

```sh
npm ci
npm run build
```

Start the proxy:

```sh
npm start
```

By default, it reads `config.yaml` and listens on `http://localhost:8080`. To use another config file, run:

```sh
node dist/index.js --config path/to/config.yaml
```

To rebuild and restart automatically while developing, use:

```sh
npm run dev
```

## Try the live Render deployment

The project is deployed for testing at [https://reverse-proxy-gzrm.onrender.com](https://reverse-proxy-gzrm.onrender.com). Try these URLs in a browser or with `curl`:

| Proxy URL | Configured route | Upstream |
| --- | --- | --- |
| [`/`](https://reverse-proxy-gzrm.onrender.com/) | `/` | `jsonplaceholder.typicode.com` |
| [`/posts`](https://reverse-proxy-gzrm.onrender.com/posts) | `/posts` | `jsonplaceholder.typicode.com` |
| [`/posts/1`](https://reverse-proxy-gzrm.onrender.com/posts/1) | `/posts/:id` | `jsonplaceholder.typicode.com` |
| [`/posts/1/comments`](https://reverse-proxy-gzrm.onrender.com/posts/1/comments) | `/posts/:id/comments` | `jsonplaceholder.typicode.com` |
| [`/objects`](https://reverse-proxy-gzrm.onrender.com/objects) | `/objects` | `api.restful-api.dev` |

For example:

```sh
curl https://reverse-proxy-gzrm.onrender.com/posts/1
curl https://reverse-proxy-gzrm.onrender.com/posts/1/comments
curl https://reverse-proxy-gzrm.onrender.com/objects
```

These examples use the routes and upstreams in the repository's `config.yaml`. The deployed service is for testing the learning project; it currently forwards requests as `GET` only.

## Try a request locally

With the example config, `/posts/1` matches `/posts/:id` and is forwarded to `jsonplaceholder.typicode.com`:

```sh
curl http://localhost:8080/posts/1
```

The configured upstream path (including its query string) is preserved. For example, `/posts/1?foo=bar` is sent upstream with that path and query string.

## Configure routes and upstreams

Edit `config.yaml`. A route maps a path pattern to an upstream key; the `upstreams` section maps that key to a hostname.

```yaml
server:
  port: 8080
  worker_threads: 4
  rules:
    - path: /posts/:id/comments
      upstream: posts_api
    - path: /posts/:id
      upstream: posts_api
    - path: /posts
      upstream: posts_api
  upstreams:
    - posts_api: jsonplaceholder.typicode.com
```

Path parameters such as `:id` are supported. `path-to-regexp` also supports named wildcards and optional path sections; see its [syntax documentation](https://github.com/pillarjs/path-to-regexp#readme). Keep route order in mind because this project selects the first matching rule.

Currently, upstream values are plain hostnames. Requests use Node's `http` client on its default HTTP port; HTTPS upstreams and custom upstream ports are not configured yet.

## Deploy on Render

Create a **Web Service** for this repository and use:

- **Build command:** `npm ci && npm run build`
- **Start command:** `npm start`

The app uses Render's `PORT` environment variable when present and binds to `0.0.0.0`. Locally, it falls back to the `port` in `config.yaml` (8080 in the example). Render documents these requirements in its [web service port binding guide](https://render.com/docs/web-services).

## How the code is organized

- `src/index.ts` parses command-line options, loads the YAML file, and starts the server.
- `src/parser/configparser.ts` reads YAML and validates it.
- `src/schemas/` contains the config and worker-message schemas.
- `src/server.ts` starts the HTTP server and cluster workers, sends requests to workers, and relays responses.
- `src/route-matcher.ts` matches a request path to a configured route.

## Learning-project limitations

- Only `GET` is sent upstream. The incoming HTTP method, request body, and headers are not forwarded.
- The `headers` section in the example config is accepted by validation but is not applied yet.
- Upstreams use plain HTTP; HTTPS, custom ports, and redirect handling are not implemented.
- Upstream connection errors and worker failures do not yet have complete client-facing error handling.
- There is no automated test suite yet.

These are useful next areas to explore when extending the project.
