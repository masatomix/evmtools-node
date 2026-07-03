# 実装計画

## タスク記法テンプレート

作業分解のスタイルに合わせて、以下のパターンを使い分ける:

### 親タスクのみ
- [ ] {{NUMBER}}. {{TASK_DESCRIPTION}}{{PARALLEL_MARK}}
  - {{DETAIL_ITEM_1}} *(必要な場合のみ詳細を記述。タスクが単独で完結するならサブ項目は省略する。)*
  - _Requirements: {{REQUIREMENT_IDS}}_

### 親 + サブタスク構造
- [ ] {{MAJOR_NUMBER}}. {{MAJOR_TASK_SUMMARY}}
- [ ] {{MAJOR_NUMBER}}.{{SUB_NUMBER}} {{SUB_TASK_DESCRIPTION}}{{SUB_PARALLEL_MARK}}
  - {{DETAIL_ITEM_1}}
  - {{DETAIL_ITEM_2}}
  - {{OBSERVABLE_COMPLETION_ITEM}} *(少なくとも 1 つは、このタスクの観測可能な完了条件を明示する。)*
  - _Requirements: {{REQUIREMENT_IDS}}_ *(ID のみ。説明や括弧は付けない。)*
  - _Boundary: {{COMPONENT_NAMES}}_ *(並列 (P) タスクのみ。スコープが自明な場合は省略可。)*
  - _Depends: {{TASK_IDS}}_ *(自明でないクロス境界依存のみ。多くのタスクは省略する。)*

> **並列マーカー**: 並列実行可能なタスクのみ末尾に ` (P)` を付ける。`--sequential` モードで実行する場合は付けない。
>
> **任意のテスト工程**: サブタスクが受入基準に紐づく後回し可能なテスト作業の場合、チェックボックスを `- [ ]*` とし、詳細項目で対象要件を補足する。
