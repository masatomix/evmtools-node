# 要件定義書

## はじめに
{{INTRODUCTION}}

<!-- 範囲の解釈ミスが起きうる場合や、隣接システム/仕様と関わる機能で記載する -->
## 範囲（境界コンテキスト）（任意）
- **対象範囲**: {{IN_SCOPE_BEHAVIORS}}
- **対象外**: {{OUT_OF_SCOPE_BEHAVIORS}}
- **隣接システム/仕様への期待**: {{ADJACENT_SYSTEM_OR_SPEC_EXPECTATIONS}}

## 要件

### 要件 1: {{REQUIREMENT_AREA_1}}
<!-- 要件の見出しには先頭に数字IDのみ付与すること（例: "要件 1: ...", "1. 概要", "2 機能: ..."）。"要件 A" のようなアルファベットIDは不可。 -->
**目的:** {{ROLE}} として、{{CAPABILITY}} を行いたい。それにより {{BENEFIT}} を実現する。

#### 受入基準（Acceptance Criteria）
1. When [event], the [system] shall [response/action]
2. If [trigger], then the [system] shall [response/action]
3. While [precondition], the [system] shall [response/action]
4. Where [feature is included], the [system] shall [response/action]
5. The [system] shall [response/action]

### 要件 2: {{REQUIREMENT_AREA_2}}
**目的:** {{ROLE}} として、{{CAPABILITY}} を行いたい。それにより {{BENEFIT}} を実現する。

#### 受入基準（Acceptance Criteria）
1. When [event], the [system] shall [response/action]
2. When [event] and [condition], the [system] shall [response/action]

<!-- 以降の要件も同じパターンで記述する -->
