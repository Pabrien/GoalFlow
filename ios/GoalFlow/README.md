# GoalFlow iOS

SwiftUIで作ったGoalFlowのネイティブ版プロトタイプです。

## できること

- 目標を作る
- 行動リストを作る
- 行動を日付に入れる
- 今日のタスクを完了する
- 今日・全体・目標別の進捗を見る
- ローカルJSONへ保存する

## 開き方

Xcodeで以下を開きます。

```txt
ios/GoalFlow/GoalFlow.xcodeproj
```

またはターミナルでビルドします。

```sh
xcodebuild -project ios/GoalFlow/GoalFlow.xcodeproj -scheme GoalFlow -destination 'platform=iOS Simulator,name=iPhone 17' build
```

## 次に入れると強いもの

- 通知とリマインダー
- iCloud同期
- 完了音と触覚フィードバックの調整
- ウィジェット
- Paskraへ名称統一する場合のBundle ID/表示名変更
