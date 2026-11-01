# All is well 항공 (Ignav 연동)

## 처음 한 번만
1. `server/.env` 파일을 열어 `여기에_키_붙여넣기`를 Ignav API 키로 바꾸고 저장
2. 터미널에서
   ```
   npm install
   ```
   (루트와 server 폴더가 한 번에 설치됩니다)

## 실행 (명령 하나)
```
npm run dev
```
브라우저에서 http://localhost:5173 을 열면 됩니다.

## 구조
- `src/App.jsx`  화면 (API 키 없음)
- `server/server.js`  Ignav 호출 + 캐시 + 호출 제한 (키는 `server/.env`에만 있음)
- `vite.config.js`  `/api` 요청을 서버(4000)로 전달
