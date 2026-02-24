기존 코드 중 한국어로 작성된 부분은 수정하지 않는다. 현재 인코딩 관련 오류가 있기 때문이다.

## 인코딩 규칙 (필수)
- 파일 읽기/쓰기 시 인코딩을 항상 명시한다.
- `Encoding.Default`/암묵 인코딩 사용 금지.
- 기본 원칙: UTF-8로 처리하되, 파일의 기존 BOM 상태를 보존한다.
  - 기존이 BOM이면 UTF-8 BOM으로 저장
  - 기존이 no BOM이면 UTF-8 no BOM으로 저장

## PowerShell 일괄 수정 규칙
- 일괄 수정 전 파일의 BOM 유무를 먼저 확인한다.
- 읽기: `ReadAllText(..., [Text.UTF8Encoding]::new($false,$true))`
- 쓰기: BOM 유무에 맞춰 `[Text.UTF8Encoding]::new($true)` 또는 `[Text.UTF8Encoding]::new($false)` 사용
- 한글이 포함된 파일에 대해 `Encoding.Default`로 읽고 쓰는 라운드트립 금지.