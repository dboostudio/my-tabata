# TabataGo QA 시나리오

`npm run qa` 실행 전 `npm run dev`로 앱을 먼저 띄울 것.

---

## 기본 플로우

```bash
EXPECT_BASE_URL=http://localhost:5173 expect-cli -m "타바타 클래식 프리셋을 선택하고 타이머를 시작해서 카운트다운, 운동, 휴식 페이즈 전환이 올바르게 동작하는지 확인해줘. 원형 프로그레스가 부드럽게 줄어드는지, 라운드 도트가 올바르게 활성화되는지 체크해줘." -y
```

## 설정 패널

```bash
EXPECT_BASE_URL=http://localhost:5173 expect-cli -m "설정 패널을 열고 운동시간 30초, 휴식시간 15초, 8라운드로 변경 후 적용해. 타이머 화면에 변경사항이 반영되는지 확인해줘." -y
```

## 소리 토글

```bash
EXPECT_BASE_URL=http://localhost:5173 expect-cli -m "소리 버튼을 클릭해서 🔊→🔈→🔇 3단계로 변경되는지 확인하고, 각 상태에서 타이머를 시작해봐." -y
```

## 미니멀 모드

```bash
EXPECT_BASE_URL=http://localhost:5173 expect-cli -m "설정에서 미니멀 모드를 켜고 타이머를 실행했을 때 라운드 도트, 진행바, 다음 페이즈 레이블이 숨겨지는지 확인해줘." -y
```

## 완료 플로우

```bash
EXPECT_BASE_URL=http://localhost:5173 expect-cli -m "입문자 프리셋(짧은 시간)으로 타이머를 완주시켜서 완료 요약 카드가 표시되는지, 공유 버튼이 있는지, 다시 시작이 작동하는지 확인해줘." -y
```

## 스프린트 변경사항 전체 검증

```bash
# git diff 기반 자동 테스트 생성
EXPECT_BASE_URL=http://localhost:5173 expect-cli --target branch -y
```
