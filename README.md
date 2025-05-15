# Linux-Like TODO Management

Linux의 스케줄링 알고리즘을 기반으로 한 TODO 관리 애플리케이션입니다.

## 주요 기능

- **Deadline 태스크**: EDF (Earliest Deadline First) 알고리즘 사용
- **Real-time 태스크**: FIFO/RR (Round Robin) 알고리즘 지원
- **Normal 태스크**: CFS (Completely Fair Scheduler) 알고리즘 사용
- **일일 루틴**: 매일 자동으로 리셋되는 태스크 관리
- **시간 양자(Time Quantum) 관리**: 태스크별 실행 시간 제어

## 기술 스택

- Next.js
- TypeScript
- Tailwind CSS
- Shadcn UI
- Sonner (Toast 알림)

## 프로젝트 구조

- `app/page.tsx`: 메인 애플리케이션 컴포넌트
- `components/ui/`: UI 컴포넌트
- `public/`: 정적 파일
