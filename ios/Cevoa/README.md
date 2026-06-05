# Cevoa iOS

SwiftUIで作ったCevoaのネイティブ版プロトタイプです。

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
ios/Cevoa/Cevoa.xcodeproj
```

またはターミナルでビルドします。

```sh
xcodebuild -project ios/Cevoa/Cevoa.xcodeproj -scheme Cevoa -destination 'platform=iOS Simulator,name=iPhone 17' build
```

## 次に入れると強いもの

- 通知とリマインダー
- 完了音と触覚フィードバックの調整
- ウィジェット
- App Store配布に向けたBundle ID/表示名の最終調整
