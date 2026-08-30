-- image_style_sets에 "지적할 때마다 스스로 업데이트되는 캐릭터 규칙" 컬럼 추가.
-- 실제 사례(유튜브: 인스타툰 작가 애린님 캐러셀 자동화, 2026-08-21)에서 확인된 패턴 —
-- 매번 새로 설명하지 않고, 틀린 점을 지적하면 AI가 기존 규칙에 병합해서 계속 누적한다.
alter table image_style_sets add column if not exists learned_rules text not null default '';
