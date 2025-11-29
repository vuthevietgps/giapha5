# Deploy Notes (Camera + Docker)

## Camera on Web (Browser)
- Works in mobile browsers via `<input accept="image/*" capture>` and Capacitor Camera web implementation.
- Requires HTTPS in production for camera access (except `localhost`).
- Ensure your domain is served over HTTPS (via Nginx/Caddy reverse proxy). The Angular app itself is static; no native wrapper needed.

## Server Uploads
- The backend serves uploaded files at `/uploads`.
- Persist uploads by mounting the `uploads` directory as a volume for the server container.

Example volume for the server service:
```
volumes:
  - ./uploads:/app/uploads
```

## CORS and Routes
- API base: `/api` (configured in NestJS).
- Static uploads: `/uploads`.
- Ensure reverse proxy forwards these paths to the backend container.

## Sample Reverse Proxy (Nginx)
```
location /api/ {
  proxy_pass http://server:3000/api/;
}
location /uploads/ {
  proxy_pass http://server:3000/uploads/;
}
```

## Docker Considerations
- There are no Dockerfiles in this repo yet. You can:
  - Build Angular web to `web/dist/web/browser` and serve via Nginx.
  - Run NestJS server (Node 22) exposing port `3000`.
- If adding Dockerfiles, remember to mount `./uploads` and set `MONGODB_URI`.

## Android Emulator Networking
- If you run the backend on your PC and the app in Android emulator, use `http://10.0.2.2:3000` as the API base.
- For device testing, ensure your PC IP is reachable and served via HTTPS if you want camera without warnings.
