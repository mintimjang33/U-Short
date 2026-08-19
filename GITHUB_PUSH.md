# GitHub 커밋/푸시 방법 (이 프로젝트에서 실제로 성공한 방식)

## 저장소
`https://github.com/mintimjang33/U-Short.git`

## 왜 필요했나
이 PC의 curl(8.13.0, Windows, SSPI 빌드)와 git이 **Personal Access Token(PAT)을 `-u user:token`이나
`https://user:token@github.com/...` URL 형식으로 넣어도 Authorization 헤더 자체가 전송되지 않는 문제**가 있었다.
- `git push`: `remote: Invalid username or token. Password authentication is not supported for Git operations.`
- `curl -u x-access-token:<token> https://api.github.com/user`: `{"message": "Requires authentication"}` (401)

원인은 토큰이나 계정 문제가 아니라 **Windows SSPI 통합인증이 켜진 curl/git 빌드가 Basic 인증을 preemptive하게
보내지 않고 다른 인증 방식을 먼저 시도하다 조용히 실패**하는 것으로 추정됨.
`curl -H "Authorization: Basic <base64>"`로 헤더를 직접 넣으면 정상 작동하는 것으로 확인해 원인을 좁혔다.

**해결책: `git -c http.extraHeader`로 Authorization 헤더를 직접 지정.** URL에 토큰을 넣지 않아도 되고,
remote 주소도 깨끗하게 유지된다.

## 1. PAT(개인 액세스 토큰) 발급받기

1. GitHub 로그인한 상태에서 오른쪽 위 프로필 클릭 → **Settings**
2. 왼쪽 맨 아래 **Developer settings**
3. **Personal access tokens → Tokens (classic)** → **Generate new token (classic)**
4. Note(이름)는 아무거나, **repo** 권한 체크박스만 체크
5. **Generate token** 클릭 → `ghp_...`로 시작하는 문자열이 나옴 (이때 한 번만 보여주므로 복사해두기)

## 2. 토큰을 Base64 Basic 인증 헤더로 변환

```
x-access-token:<발급받은토큰>
```
형태의 문자열을 Base64로 인코딩한다. PowerShell에서:

```powershell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("x-access-token:<발급받은토큰>"))
```

## 3. 그 헤더로 push하기

터미널(cmd 또는 PowerShell)에서 프로젝트 폴더로 이동한 뒤:

```
git -c http.extraHeader="Authorization: Basic <2번에서 만든 base64 문자열>" push https://github.com/mintimjang33/U-Short.git main
```

URL에는 토큰을 넣지 않으므로 remote를 따로 정리할 필요가 없다.

## 4. 다음에 또 push할 때는?

같은 토큰이 있다면(만료 전) 3번의 명령 한 줄만 다시 실행하면 된다.
토큰을 잃어버렸거나 만료됐으면 1번부터 새로 발급받아 2번 인코딩부터 다시 하면 된다.
push가 끝나면 GitHub Settings → Developer settings → Personal access tokens에서 토큰을 폐기(Delete)해도 무방하다.

## 참고: 왜 `-u`나 URL 방식 대신 이 방식을 쓰는가

같은 토큰으로 아래는 모두 실패했었다 (이 PC 환경 한정, 토큰/계정/저장소 문제 아님):
- `git push "https://x-access-token:<token>@github.com/..."` — 실패
- `git -c credential.helper= push ...` — 실패 (Credential Manager 문제 아니었음)
- `git -c credential.https://github.com.helper= -c credential.helper= push ...` — 실패
- `curl -u x-access-token:<token> ...` — 실패 (`Requires authentication`)

반면 아래는 즉시 성공했다:
- `curl -H "Authorization: Basic <base64>" ...` — 성공
- `git -c http.extraHeader="Authorization: Basic <base64>" push ...` — 성공

새 세션에서 이 문제를 다시 만나면 credential helper를 의심하지 말고 바로 `http.extraHeader` 방식을 시도할 것.
